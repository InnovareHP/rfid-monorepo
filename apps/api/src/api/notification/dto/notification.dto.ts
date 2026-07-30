import { z } from "zod";

export const MarkReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
