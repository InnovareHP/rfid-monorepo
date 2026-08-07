import { redis } from "../redis/redis";

export type SlidingLimit = {
  key: string;
  limit: number;
  windowSeconds: number;
  blockSeconds?: number;
};

export type SlidingLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

const blockKey = (key: string) => `ratelimit:block:${key}`;
const countKey = (key: string) => `ratelimit:count:${key}`;

// Fixed-window counter with an optional cooldown block once the window is exceeded.
export const consumeSlidingLimit = async ({
  key,
  limit,
  windowSeconds,
  blockSeconds,
}: SlidingLimit): Promise<SlidingLimitResult> => {
  const blockedFor = await redis.ttl(blockKey(key));
  if (blockedFor > 0) {
    return { allowed: false, retryAfterSeconds: blockedFor };
  }

  const count = await redis.incr(countKey(key));
  if (count === 1) {
    await redis.expire(countKey(key), windowSeconds);
  }

  if (count <= limit) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (blockSeconds) {
    await redis.set(blockKey(key), "1", "EX", blockSeconds);
    return { allowed: false, retryAfterSeconds: blockSeconds };
  }

  const windowLeft = await redis.ttl(countKey(key));
  return { allowed: false, retryAfterSeconds: Math.max(windowLeft, 1) };
};
