import { randomBytes } from "crypto";
import { redis } from "../redis/redis";

const KEY_PREFIX = "passkey:reg";

const SIGNUP_TOKEN_BYTES = 32;
const RECOVERY_TOKEN_BYTES = 20;

const SIGNUP_TTL_SECONDS = 60 * 10;
const SELF_RECOVERY_TTL_SECONDS = 60 * 10;
const OWNER_RECOVERY_TTL_SECONDS = 60 * 60 * 24;

export type SignupClaim = {
  kind: "signup";
  email: string;
  name: string;
  displayName: string;
};

export type RecoveryClaim = {
  kind: "recovery";
  userId: string;
  email: string;
};

export type EnrollmentClaim = SignupClaim | RecoveryClaim;

const key = (token: string) => `${KEY_PREFIX}:${token}`;

// The token is the entire authorization, so it is unguessable rather than signed.
export const createSignupClaim = async (claim: Omit<SignupClaim, "kind">) => {
  const token = randomBytes(SIGNUP_TOKEN_BYTES).toString("base64url");
  await redis.set(
    key(token),
    JSON.stringify({ kind: "signup", ...claim } satisfies SignupClaim),
    "EX",
    SIGNUP_TTL_SECONDS
  );
  return { token, expiresInSeconds: SIGNUP_TTL_SECONDS };
};

export const createRecoveryClaim = async (
  claim: Omit<RecoveryClaim, "kind">,
  scope: "self" | "owner"
) => {
  const token = randomBytes(RECOVERY_TOKEN_BYTES).toString("base64url");
  const ttl =
    scope === "owner" ? OWNER_RECOVERY_TTL_SECONDS : SELF_RECOVERY_TTL_SECONDS;
  await redis.set(
    key(token),
    JSON.stringify({ kind: "recovery", ...claim } satisfies RecoveryClaim),
    "EX",
    ttl
  );
  return { token, expiresInSeconds: ttl };
};

// Non-consuming read for building registration options, since the ceremony
// may still be abandoned at the biometric prompt.
export const peekEnrollmentClaim = async (
  token: string
): Promise<EnrollmentClaim | null> => {
  const raw = await redis.get(key(token));
  return raw ? (JSON.parse(raw) as EnrollmentClaim) : null;
};

// Atomic consume after WebAuthn verifies, so one grant yields one credential.
export const consumeEnrollmentClaim = async (
  token: string
): Promise<EnrollmentClaim | null> => {
  const raw = await redis.getdel(key(token));
  return raw ? (JSON.parse(raw) as EnrollmentClaim) : null;
};
