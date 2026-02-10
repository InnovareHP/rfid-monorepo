import { Redis } from "ioredis";

export const redis = new Redis(process.env.REDIS_URL!);

export const cacheData = async (key: string, data: any, ttl: number) => {
  await redis.set(key, JSON.stringify(data), "EX", ttl);
};

export const getData = async (key: string) => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
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
