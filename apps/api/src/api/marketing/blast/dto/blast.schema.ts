import { ModuleType } from "@prisma/client";
import { z } from "zod";

export const CreateBlastSchema = z.object({
  name: z.string().min(1),
  campaignId: z.string().nullable().optional(),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  moduleType: z.enum(ModuleType).default(ModuleType.LEAD),
  // A draft may have none yet; send is what requires at least one.
  groupIds: z.array(z.string()).default([]),
  scheduledAt: z.string().optional(),
});

export const UpdateBlastSchema = CreateBlastSchema.partial();

export const SendBlastSchema = z.object({
  sendVia: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});
