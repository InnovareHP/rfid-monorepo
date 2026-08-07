import { ModuleType } from "@prisma/client";
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
  moduleType: z.enum(ModuleType).default(ModuleType.LEAD),
  filter: AudienceFilterSchema,
});

export const UpdateGroupSchema = CreateGroupSchema.partial();

// Counts an unsaved filter so the editor can show a total while it is built.
export const PreviewGroupSchema = z.object({
  moduleType: z.enum(ModuleType).default(ModuleType.LEAD),
  filter: AudienceFilterSchema,
});
