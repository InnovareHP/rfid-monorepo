import { z } from "zod";

export const CreateBlastSchema = z.object({
  name: z.string().min(1),
  campaignId: z.string().nullable().optional(),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  // A draft may have none yet; send is what requires at least one. Groups may
  // target different modules; the send unions them and dedupes on record.
  groupIds: z.array(z.string()).default([]),
  scheduledAt: z.string().optional(),
});

export const UpdateBlastSchema = CreateBlastSchema.partial();

export const SendBlastSchema = z.object({
  sendVia: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});
