import {
  getAssistantHistory,
  streamAssistant,
} from "@/services/assistant/assistant-service";
import {
  AI_ASSISTANCE_ERROR_MESSAGE,
  AI_ASSISTANCE_FALLBACK_MESSAGE,
  AI_ASSISTANCE_FORM_MESSAGE,
  type AssistantFormPrefill,
  type ChatMessage,
} from "@dashboard/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const SESSION_STORAGE_KEY = "refidly-assistant-session";

// One transcript per browser tab, so a reload replays what the server still holds.
function currentSessionId() {
  const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

export function useAssistantChat() {
  const [sessionId, setSessionId] = useState(currentSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const { data: replayed = [] } = useQuery({
    queryKey: ["assistant-session", sessionId],
    queryFn: () => getAssistantHistory(sessionId),
    staleTime: Infinity,
  });

  const allMessages: ChatMessage[] = [
    ...replayed.map((turn, index) => ({ ...turn, id: `replay-${index}` })),
    ...messages,
  ];

  const hasOpenForm = allMessages.some(
    (msg) => msg.showAssistanceForm && !msg.formSubmitted
  );

  const patch = (id: string, change: Partial<ChatMessage>) =>
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...change } : msg))
    );

  const send = async (text: string) => {
    const pendingId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
      { id: pendingId, role: "assistant", content: "", pending: true },
    ]);
    setIsStreaming(true);

    try {
      await streamAssistant({ sessionId, question: text }, (event) => {
        if (event.type === "token") {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === pendingId
                ? {
                    ...msg,
                    content: msg.content + event.text,
                    pending: false,
                    step: undefined,
                  }
                : msg
            )
          );
          return;
        }
        if (event.type === "step") {
          patch(pendingId, { pending: true, step: event.tool });
          return;
        }
        if (event.type === "reset") {
          patch(pendingId, { content: "", pending: true, step: undefined });
          return;
        }
        if (event.type === "error") {
          patch(pendingId, {
            content: AI_ASSISTANCE_ERROR_MESSAGE,
            pending: false,
            step: undefined,
            showAssistanceForm: true,
          });
          return;
        }

        const prefill = event.actions.find(
          (action) => action.kind === "open_form"
        )?.prefill;
        patch(
          pendingId,
          event.answered && event.answer
            ? {
                content: event.answer,
                pending: false,
                step: undefined,
                actions: event.actions,
              }
            : {
                content: AI_ASSISTANCE_FALLBACK_MESSAGE,
                pending: false,
                step: undefined,
                showAssistanceForm: true,
                prefill,
              }
        );
      });
    } catch {
      patch(pendingId, {
        content: AI_ASSISTANCE_ERROR_MESSAGE,
        pending: false,
        step: undefined,
        showAssistanceForm: true,
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const openAssistanceForm = () =>
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: AI_ASSISTANCE_FORM_MESSAGE,
        showAssistanceForm: true,
      },
    ]);

  // A replayed message has no local row to patch, so the form opens as a new one.
  const openFormOnMessage = (
    messageId: string,
    prefill: AssistantFormPrefill
  ) => {
    if (!messages.some((msg) => msg.id === messageId)) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: AI_ASSISTANCE_FORM_MESSAGE,
          showAssistanceForm: true,
          prefill,
        },
      ]);
      return;
    }
    patch(messageId, { showAssistanceForm: true, prefill, actions: undefined });
  };

  const markFormSubmitted = (messageId: string) =>
    patch(messageId, { formSubmitted: true });

  const reset = () => {
    const created = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, created);
    setMessages([]);
    setSessionId(created);
  };

  return {
    messages: allMessages,
    hasOpenForm,
    isStreaming,
    send,
    reset,
    openAssistanceForm,
    openFormOnMessage,
    markFormSubmitted,
  };
}
