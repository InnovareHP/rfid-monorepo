import { ModuleType } from "@prisma/client";
import { z } from "zod";

export const AudienceFilterSchema = z.object({
  filter: z.record(z.string(), z.string()).default({}),
  search: z.string().optional(),
  boardDateFrom: z.string().optional(),
  boardDateTo: z.string().optional(),
});

export const CreateBlastSchema = z.object({
  name: z.string().min(1),
  campaignId: z.string().optional(),
  subject: z.string().min(1),
  bodyHtml: z.string().min(1),
  moduleType: z.enum(ModuleType).default(ModuleType.LEAD),
  audienceFilter: AudienceFilterSchema,
  scheduledAt: z.string().optional(),
});

export const UpdateBlastSchema = CreateBlastSchema.partial();

export const SendBlastSchema = z.object({
  sendVia: z.enum(["AUTO", "GMAIL", "OUTLOOK"]).optional(),
});
