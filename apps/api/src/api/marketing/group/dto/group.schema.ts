import { AudienceType } from "@prisma/client";
import { z } from "zod";

export const AudienceFilterSchema = z.object({
  filter: z.record(z.string(), z.string()).default({}),
  search: z.string().optional(),
  boardDateFrom: z.string().optional(),
  boardDateTo: z.string().optional(),
});

// Raw fields carry no .default(): a default still resolves when the key is
// omitted, even under .partial(), so an update built that way would reset the
// module and wipe the saved filter on every name-only save.
const nameField = z.string().min(1);
const descriptionField = z.string();
const moduleTypeField = z.string();
const audienceTypeField = z.enum(AudienceType);

export const CreateGroupSchema = z.object({
  name: nameField,
  description: descriptionField.optional(),
  moduleType: moduleTypeField.default("LEAD"),
  // A SUBSCRIBER group reads the newsletter list, so its moduleType and filter
  // are ignored rather than describing board records.
  audienceType: audienceTypeField.default(AudienceType.BOARD),
  filter: AudienceFilterSchema,
});

export const UpdateGroupSchema = z.object({
  name: nameField.optional(),
  description: descriptionField.optional(),
  moduleType: moduleTypeField.optional(),
  audienceType: audienceTypeField.optional(),
  filter: AudienceFilterSchema.optional(),
});

// Counts an unsaved filter so the editor can show a total while it is built.
export const PreviewGroupSchema = z.object({
  moduleType: moduleTypeField.default("LEAD"),
  audienceType: audienceTypeField.default(AudienceType.BOARD),
  filter: AudienceFilterSchema,
});
