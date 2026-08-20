import { AudienceType } from "@prisma/client";
import { z } from "zod";

export const AudienceFilterSchema = z.object({
  filter: z.record(z.string(), z.string()).default({}),
  search: z.string().optional(),
  boardDateFrom: z.string().optional(),
  boardDateTo: z.string().optional(),
});

export const CreateGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  moduleType: z.string().default("LEAD"),
  // A SUBSCRIBER group reads the newsletter list, so its moduleType and filter
  // are ignored rather than describing board records.
  audienceType: z.enum(AudienceType).default(AudienceType.BOARD),
  filter: AudienceFilterSchema,
});

export const UpdateGroupSchema = CreateGroupSchema.partial();

// Counts an unsaved filter so the editor can show a total while it is built.
export const PreviewGroupSchema = z.object({
  moduleType: z.string().default("LEAD"),
  audienceType: z.enum(AudienceType).default(AudienceType.BOARD),
  filter: AudienceFilterSchema,
});
