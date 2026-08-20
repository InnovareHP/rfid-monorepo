import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  InvokeModelCommand,
  type ContentBlock,
  type ImageFormat,
  type Tool,
  type ToolInputSchema,
} from "@aws-sdk/client-bedrock-runtime";
import { Logger } from "@nestjs/common";
import { appConfig } from "../../config/app-config";

const logger = new Logger("Bedrock");

export const bedrockClient = new BedrockRuntimeClient({
  region: appConfig.AWS_REGION,
  credentials: {
    accessKeyId: appConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: appConfig.AWS_SECRET_ACCESS_KEY,
  },
});

async function converse(args: {
  modelId: string;
  contents: ContentBlock[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const res = await bedrockClient.send(
    new ConverseCommand({
      modelId: args.modelId,
      messages: [{ role: "user", content: args.contents }],
      inferenceConfig: {
        maxTokens: args.maxTokens ?? 2048,
        temperature: args.temperature ?? 0.2,
      },
    })
  );

  const text =
    res.output?.message?.content?.find((c) => "text" in c)?.text ?? "";
  if (!text) {
    logger.warn(
      `Bedrock returned empty text. stopReason=${res.stopReason ?? "unknown"}`
    );
  }
  return text;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text.trim();
}

function toImageFormat(mimeType: string): ImageFormat {
  const subtype = mimeType.split("/")[1]?.toLowerCase() ?? "";
  if (subtype === "jpg" || subtype === "jpeg") return "jpeg";
  if (subtype === "gif") return "gif";
  if (subtype === "webp") return "webp";
  return "png";
}

export async function bedrockGenerateText(
  prompt: string,
  opts?: { modelId?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const text = await converse({
    modelId: opts?.modelId ?? appConfig.BEDROCK_MODEL_ID,
    contents: [{ text: prompt }],
    maxTokens: opts?.maxTokens,
    temperature: opts?.temperature,
  });
  return extractJson(text);
}

export type ConverseTool = {
  name: string;
  description: string;
  // The SDK types this as a document, so it carries the JSON Schema unchanged.
  schema: ToolInputSchema["json"];
};

export type ConverseTurn = {
  role: "user" | "assistant";
  content: ContentBlock[];
};

export type ConverseResult = {
  text: string;
  toolCalls: { id: string; name: string; input: unknown }[];
  // Echoed back verbatim with the tool results, or the provider rejects the transcript.
  raw: ConverseTurn;
};

function toToolSpecs(tools: ConverseTool[]): Tool[] {
  return tools.map((tool) => ({
    toolSpec: {
      name: tool.name,
      description: tool.description,
      inputSchema: { json: tool.schema } as ToolInputSchema,
    },
  }));
}

type ConverseOptions = {
  system: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
};

// Rebuilds the same ConverseResult the non-streaming path returns, so callers share one contract.
export async function converseStreamWithTools(
  messages: ConverseTurn[],
  tools: ConverseTool[],
  opts: ConverseOptions,
  onToken: (text: string) => void
): Promise<ConverseResult> {
  const res = await bedrockClient.send(
    new ConverseStreamCommand({
      modelId: opts.modelId ?? appConfig.BEDROCK_MODEL_ID,
      system: [{ text: opts.system }],
      messages,
      toolConfig: tools.length ? { tools: toToolSpecs(tools) } : undefined,
      inferenceConfig: {
        maxTokens: opts.maxTokens ?? 1024,
        temperature: opts.temperature ?? 0.2,
      },
    })
  );

  const texts = new Map<number, string>();
  const toolUses = new Map<
    number,
    { id: string; name: string; json: string }
  >();
  const order: number[] = [];

  for await (const event of res.stream ?? []) {
    const startIndex = event.contentBlockStart?.contentBlockIndex;
    if (startIndex !== undefined) {
      const start = event.contentBlockStart?.start?.toolUse;
      if (start) {
        toolUses.set(startIndex, {
          id: start.toolUseId ?? "",
          name: start.name ?? "",
          json: "",
        });
        order.push(startIndex);
      }
    }

    const deltaIndex = event.contentBlockDelta?.contentBlockIndex;
    if (deltaIndex !== undefined) {
      const delta = event.contentBlockDelta?.delta;
      if (delta && "text" in delta && delta.text) {
        if (!texts.has(deltaIndex)) order.push(deltaIndex);
        texts.set(deltaIndex, (texts.get(deltaIndex) ?? "") + delta.text);
        onToken(delta.text);
      }
      const partial = delta && "toolUse" in delta ? delta.toolUse?.input : null;
      if (partial) {
        const pending = toolUses.get(deltaIndex);
        if (pending) pending.json += partial;
      }
    }
  }

  const content = order.map((index): ContentBlock => {
    const toolUse = toolUses.get(index);
    if (toolUse) {
      return {
        toolUse: {
          toolUseId: toolUse.id,
          name: toolUse.name,
          input: parseToolInput(toolUse.json),
        },
      };
    }
    return { text: texts.get(index) ?? "" };
  });

  const text = order
    .map((index) => texts.get(index) ?? "")
    .join("")
    .trim();

  return {
    text,
    toolCalls: order.flatMap((index) => {
      const toolUse = toolUses.get(index);
      if (!toolUse) return [];
      return [
        {
          id: toolUse.id,
          name: toolUse.name,
          input: parseToolInput(toolUse.json),
        },
      ];
    }),
    raw: { role: "assistant", content },
  };
}

// A tool block that streamed no arguments closes with an empty string, not "{}".
function parseToolInput(json: string): ToolInputSchema["json"] {
  if (!json.trim()) return {};
  try {
    return JSON.parse(json) as ToolInputSchema["json"];
  } catch {
    logger.warn("Bedrock streamed unparsable tool input");
    return {};
  }
}

// Chat answers are prose, so they skip the JSON extraction the other callers need.
export async function bedrockGenerateProse(
  prompt: string,
  opts?: { modelId?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const text = await converse({
    modelId: opts?.modelId ?? appConfig.BEDROCK_MODEL_ID,
    contents: [{ text: prompt }],
    maxTokens: opts?.maxTokens,
    temperature: opts?.temperature,
  });
  return text.trim();
}

export async function bedrockEmbed(text: string): Promise<number[]> {
  const res = await bedrockClient.send(
    new InvokeModelCommand({
      modelId: appConfig.BEDROCK_EMBED_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ inputText: text, normalize: true }),
    })
  );

  const parsed = JSON.parse(Buffer.from(res.body).toString("utf-8")) as {
    embedding?: number[];
  };
  if (!parsed.embedding?.length) {
    throw new Error("Bedrock returned no embedding");
  }
  return parsed.embedding;
}

export async function bedrockGenerateVision(args: {
  prompt: string;
  image: { mimeType: string; base64: string };
  modelId?: string;
  maxTokens?: number;
}): Promise<string> {
  const text = await converse({
    modelId: args.modelId ?? appConfig.BEDROCK_VISION_MODEL_ID,
    contents: [
      {
        image: {
          format: toImageFormat(args.image.mimeType),
          source: { bytes: Buffer.from(args.image.base64, "base64") },
        },
      },
      { text: args.prompt },
    ],
    maxTokens: args.maxTokens,
  });
  return extractJson(text);
}
