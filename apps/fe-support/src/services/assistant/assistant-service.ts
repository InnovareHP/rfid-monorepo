import { axiosClient } from "@/lib/axios-client";
import type { AssistantStreamEvent, ChatMessage } from "@dashboard/shared";

type StoredTurn = Pick<ChatMessage, "role" | "content" | "actions">;

export const getAssistantHistory = async (
  sessionId: string
): Promise<StoredTurn[]> => {
  const response = await axiosClient.get(`/api/assistant/session/${sessionId}`);
  return response.data;
};

// SSE over fetch rather than EventSource: the question is a body, never a query string.
export const streamAssistant = async (
  body: { sessionId: string; question: string },
  onEvent: (event: AssistantStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> => {
  const response = await fetch("/api/assistant/stream", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Assistant stream failed with ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const payload = frame.replace(/^data: /, "").trim();
      if (payload) onEvent(JSON.parse(payload) as AssistantStreamEvent);
    }
  }
};
