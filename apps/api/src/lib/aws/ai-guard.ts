import { Logger } from "@nestjs/common";
import { appConfig } from "../../config/app-config";
import { bedrockGenerateText, bedrockGenerateVision } from "./bedrock";

const logger = new Logger("AIGuard");

const PHI_GUARD_ENABLED = appConfig.AI_SCRUB_PHI;

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/g;
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;
const DOB_RE =
  /\b(?:0?[1-9]|1[0-2])[\/-](?:0?[1-9]|[12]\d|3[01])[\/-](?:19|20)\d{2}\b/g;
const MRN_RE = /\bMRN[:\s]*\w+\b/gi;

export function scrubPhi(input: string): {
  scrubbed: string;
  hits: { kind: string; count: number }[];
} {
  const hits: { kind: string; count: number }[] = [];
  let out = input;
  const apply = (re: RegExp, token: string, kind: string) => {
    const m = out.match(re);
    if (m && m.length) {
      hits.push({ kind, count: m.length });
      out = out.replace(re, token);
    }
  };
  apply(SSN_RE, "[SSN]", "ssn");
  apply(MRN_RE, "[MRN]", "mrn");
  apply(DOB_RE, "[DOB]", "dob");
  apply(EMAIL_RE, "[EMAIL]", "email");
  apply(PHONE_RE, "[PHONE]", "phone");
  return { scrubbed: out, hits };
}

export interface GuardOptions {
  type: string;
  allowRawPhi?: boolean;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
}

export async function aiGenerateText(
  prompt: string,
  opts: GuardOptions
): Promise<string> {
  let toSend = prompt;
  if (PHI_GUARD_ENABLED && !opts.allowRawPhi) {
    const { scrubbed, hits } = scrubPhi(prompt);
    toSend = scrubbed;
    if (hits.length) {
      logger.warn(
        `ai.scrub type=${opts.type} hits=${hits.map((h) => `${h.kind}:${h.count}`).join(",")}`
      );
    }
  }
  return bedrockGenerateText(toSend, {
    modelId: opts.modelId,
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
  });
}

export async function aiGenerateVision(args: {
  prompt: string;
  image: { mimeType: string; base64: string };
  type: string;
  allowRawPhi?: boolean;
  modelId?: string;
  maxTokens?: number;
}): Promise<string> {
  let toSend = args.prompt;
  if (PHI_GUARD_ENABLED && !args.allowRawPhi) {
    const { scrubbed, hits } = scrubPhi(args.prompt);
    toSend = scrubbed;
    if (hits.length) {
      logger.warn(
        `ai.scrub type=${args.type} hits=${hits.map((h) => `${h.kind}:${h.count}`).join(",")}`
      );
    }
  }
  // Image bytes cannot be regex-scrubbed; vision use requires a BAA-covered
  // model/region (AI_SCRUB_PHI does not sanitize the image payload).
  return bedrockGenerateVision({
    prompt: toSend,
    image: args.image,
    modelId: args.modelId,
    maxTokens: args.maxTokens,
  });
}
