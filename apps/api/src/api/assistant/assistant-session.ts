import { AssistantAction } from "@dashboard/shared";
import { CACHE_PREFIX } from "../../lib/constant";
import { cacheData, getData } from "../../lib/redis/redis";

export type StoredTurn = {
  role: "user" | "assistant";
  content: string;
  actions?: AssistantAction[];
};

const SESSION_TTL = 60 * 60 * 24;
// Bounds what one reconnect replays and what a transcript can grow to.
const MAX_STORED_TURNS = 40;

// Namespaced by user, so a guessed session id cannot reach someone else's transcript.
function sessionKey(userId: string, sessionId: string) {
  return [CACHE_PREFIX.ASSISTANT, "session", userId, sessionId].join(":");
}

export async function getSessionTurns(
  userId: string,
  sessionId: string
): Promise<StoredTurn[]> {
  const stored = (await getData(sessionKey(userId, sessionId))) as
    | StoredTurn[]
    | null;
  return stored ?? [];
}

export async function appendSessionTurns(
  userId: string,
  sessionId: string,
  turns: StoredTurn[]
): Promise<void> {
  const existing = await getSessionTurns(userId, sessionId);
  const next = [...existing, ...turns].slice(-MAX_STORED_TURNS);
  await cacheData(sessionKey(userId, sessionId), next, SESSION_TTL);
}
