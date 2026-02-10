import { z } from "zod";

export const SendEmailSchema = z.object({
  to: z.email(),
  subject: z.string(),
  html: z.any(),
});
