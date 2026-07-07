import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type ImageFormat,
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
  if (fenced) return fenced[1]!.trim();
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
