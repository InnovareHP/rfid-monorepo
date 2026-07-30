import type { OnboardingStreamEvent } from "@dashboard/shared";

export type OnboardingPayload = {
  foundUsOn: string;
  organizationName: string;
  brandColor: string;
  logo?: string;
};

// Reads the SSE onboarding stream and resolves with the created organization id
export const onboardUser = async (
  payload: OnboardingPayload,
  onProgress: (label: string) => void
) => {
  const response = await fetch("/api/user/onboarding", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok || !response.body) {
    throw new Error("Something went wrong during onboarding.");
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let organizationId = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += value;
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const line = chunk
        .split("\n")
        .find((part) => part.startsWith("data: "));
      if (!line) continue;

      const event = JSON.parse(line.slice(6)) as OnboardingStreamEvent;

      if (event.type === "error") throw new Error(event.message);
      if (event.type === "progress") onProgress(event.label);
      if (event.type === "done") organizationId = event.organizationId;
    }
  }

  if (!organizationId) {
    throw new Error("Onboarding ended before the organization was created.");
  }

  return organizationId;
};
