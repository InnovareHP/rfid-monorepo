import { Redis } from "ioredis";
import { CACHE_PREFIX } from "../constant";
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

// One DEL per batch rather than per key: these run inside board transactions,
// where a round trip per cached page is enough to expire the 5s window.
export const purgeAllCacheKeys = async (prefix: string) => {
  const keys = await redis.keys(`${prefix}:*`);

  for (let i = 0; i < keys.length; i += 500) {
    await redis.del(...keys.slice(i, i + 500));
  }
};

// Board pages and the analytics built from them go stale on the same write, so
// one call clears both. Prefixes are passed without a trailing wildcard because
// purgeAllCacheKeys appends one.
export const purgeBoardCaches = async (
  organizationId: string,
  moduleType?: string
) => {
  await purgeAllCacheKeys(
    moduleType
      ? `${CACHE_PREFIX.BOARDS}:${organizationId}:${moduleType}`
      : `${CACHE_PREFIX.BOARDS}:${organizationId}`
  );
  await purgeAllCacheKeys(`${CACHE_PREFIX.ANALYTICS}:${organizationId}`);
};
