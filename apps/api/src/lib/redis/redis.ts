import { Redis } from "ioredis";
import { decryptString, encryptString, isEncrypted } from "../crypto/crypto";

export const redis = new Redis(process.env.REDIS_URL!);

// Cached payloads can contain PHI (board rows, AI results) — encrypt at rest in Redis
export const cacheData = async (key: string, data: any, ttl: number) => {
  await redis.set(key, encryptString(JSON.stringify(data)), "EX", ttl);
};

export const getData = async (key: string) => {
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(isEncrypted(data) ? decryptString(data) : data);
};

export const deleteData = async (key: string) => {
  await redis.del(key);
};

export const purgeAllCacheKeys = async (prefix: string) => {
  const keys = await redis.keys(`${prefix}:*`);
  for (const key of keys) {
    await redis.del(key);
  }
};
