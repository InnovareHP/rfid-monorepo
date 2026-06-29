import {
  BedrockRuntimeClient,
  InvokeModelCommand,
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

interface ClaudeTextBlock {
  type: "text";
  text: string;
}
interface ClaudeImageBlock {
  type: "image";
  source: { type: "base64"; media_type: string; data: string };
}
type ClaudeContent = ClaudeTextBlock | ClaudeImageBlock;

interface ClaudeResponse {
  content?: { type: string; text?: string }[];
}

async function invokeClaude(args: {
  modelId: string;
  contents: ClaudeContent[];
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const body = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: args.maxTokens ?? 2048,
    temperature: args.temperature ?? 0.2,
    messages: [{ role: "user", content: args.contents }],
  };

  const cmd = new InvokeModelCommand({
    modelId: args.modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(body),
  });

  const res = await bedrockClient.send(cmd);
  const raw = Buffer.from(res.body).toString("utf8");
  const parsed = JSON.parse(raw) as ClaudeResponse;
  const text = parsed.content?.find((c) => c.type === "text")?.text ?? "";
  if (!text) {
    logger.warn(`Bedrock returned empty text. raw=${raw.slice(0, 200)}`);
  }
  return text;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1]!.trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first >= 0 && last > first) return text.slice(first, last + 1);
  return text.trim();
}

export async function bedrockGenerateText(
  prompt: string,
  opts?: { modelId?: string; maxTokens?: number; temperature?: number }
): Promise<string> {
  const text = await invokeClaude({
    modelId: opts?.modelId ?? appConfig.BEDROCK_MODEL_ID,
    contents: [{ type: "text", text: prompt }],
    maxTokens: opts?.maxTokens,
    temperature: opts?.temperature,
  });
  return extractJson(text);
}

export async function bedrockGenerateVision(args: {
  prompt: string;
  image: { mimeType: string; base64: string };
  modelId?: string;
  maxTokens?: number;
}): Promise<string> {
  const text = await invokeClaude({
    modelId: args.modelId ?? appConfig.BEDROCK_VISION_MODEL_ID,
    contents: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: args.image.mimeType,
          data: args.image.base64,
        },
      },
      { type: "text", text: args.prompt },
    ],
    maxTokens: args.maxTokens,
  });
  return extractJson(text);
}
