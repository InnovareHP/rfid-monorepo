import { randomBytes } from "crypto";
import { redis } from "../redis/redis";

const KEY_PREFIX = "oauth:state";

const TOKEN_BYTES = 32;
const TTL_SECONDS = 60 * 10;

export type OAuthStateProvider =
  | "gmail"
  | "outlook"
  | "google-calendar"
  | "outlook-calendar";

export type OAuthState = {
  userId: string;
  orgId: string | null;
};

const key = (token: string) => `${KEY_PREFIX}:${token}`;

// The token carries no payload, so a forged state cannot name another user's id.
export const createOAuthState = async (
  provider: OAuthStateProvider,
  state: OAuthState
) => {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  await redis.set(
    key(token),
    JSON.stringify({ provider, ...state }),
    "EX",
    TTL_SECONDS
  );
  return token;
};

// Single use, and the provider is checked so one flow's state cannot finish another's.
export const consumeOAuthState = async (
  provider: OAuthStateProvider,
  token: string | undefined
): Promise<OAuthState | null> => {
  if (!token) return null;

  const raw = await redis.getdel(key(token));
  if (!raw) return null;

  const stored = JSON.parse(raw) as OAuthState & {
    provider: OAuthStateProvider;
  };
  if (stored.provider !== provider) return null;

  return { userId: stored.userId, orgId: stored.orgId };
};
