import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { appConfig } from "../../config/app-config";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;
const PREFIX = "enc:v1:";

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = appConfig.ENCRYPTION_KEY;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "ENCRYPTION_KEY must decode to exactly 32 bytes (base64 of 32 random bytes)"
    );
  }
  cachedKey = key;
  return key;
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptString(plaintext: string): string {
  if (isEncrypted(plaintext)) return plaintext;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptString(value: string): string {
  if (!isEncrypted(value)) return value;
  const payload = Buffer.from(value.slice(PREFIX.length), "base64");
  const iv = payload.subarray(0, IV_LEN);
  const tag = payload.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = payload.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}

export function encryptNullable(
  value: string | null | undefined
): string | null | undefined {
  if (value === null || value === undefined) return value;
  return encryptString(value);
}

export function decryptNullable(
  value: string | null | undefined
): string | null | undefined {
  if (value === null || value === undefined) return value;
  if (typeof value !== "string") return value;
  return decryptString(value);
}

export function generateKeyBase64(): string {
  return randomBytes(32).toString("base64");
}
