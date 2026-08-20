import { z } from "zod";

export const AskAssistantSchema = z.object({
  sessionId: z.uuid(),
  question: z.string().min(1).max(1000),
});
