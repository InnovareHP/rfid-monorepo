import { createHash, randomInt, timingSafeEqual } from "crypto";
import { redis } from "../redis/redis";

const TTL_SECONDS = 60 * 5;
const MAX_ATTEMPTS = 5;

export type OtpPurpose = "signup" | "migration";

// Separate namespaces so a code minted for one path cannot be redeemed on the other.
const codeKey = (purpose: OtpPurpose, email: string) =>
  `registration:otp:${purpose}:${email.toLowerCase()}`;
const attemptsKey = (purpose: OtpPurpose, email: string) =>
  `registration:otp:${purpose}:${email.toLowerCase()}:attempts`;

// Codes are stored hashed so a Redis dump does not hand over live codes.
const hash = (code: string) => createHash("sha256").update(code).digest();

export const issueOtp = async (purpose: OtpPurpose, email: string) => {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  await redis.set(
    codeKey(purpose, email),
    hash(code).toString("hex"),
    "EX",
    TTL_SECONDS
  );
  await redis.del(attemptsKey(purpose, email));
  return { code, expiresInSeconds: TTL_SECONDS };
};

export const verifyOtp = async (
  purpose: OtpPurpose,
  email: string,
  code: string
): Promise<boolean> => {
  const stored = await redis.get(codeKey(purpose, email));
  if (!stored) return false;

  // Attempt is counted before comparison so abandoning mid-request cannot dodge the burn.
  const attempts = await redis.incr(attemptsKey(purpose, email));
  await redis.expire(attemptsKey(purpose, email), TTL_SECONDS);
  if (attempts > MAX_ATTEMPTS) {
    await redis.del(codeKey(purpose, email));
    return false;
  }

  const matches = timingSafeEqual(Buffer.from(stored, "hex"), hash(code));
  if (!matches) return false;

  // Verified codes are deleted so one code cannot mint a second token.
  await redis.del(codeKey(purpose, email));
  await redis.del(attemptsKey(purpose, email));
  return true;
};
