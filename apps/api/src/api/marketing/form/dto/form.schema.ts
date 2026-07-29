import { ModuleType } from "@prisma/client";
import { z } from "zod";

export const FieldMappingSchema = z.object({
  fieldId: z.string(),
  label: z.string().min(1),
  required: z.boolean().default(false),
});

export const CreateFormSchema = z.object({
  name: z.string().min(1),
  campaignId: z.string().optional(),
  moduleType: z.enum(ModuleType).default(ModuleType.LEAD),
  fieldMappings: z.array(FieldMappingSchema).min(1),
  submitButtonText: z.string().default("Submit"),
  redirectUrl: z.url({ protocol: /^https?$/ }).optional(),
});

export const UpdateFormSchema = CreateFormSchema.partial();

export const PublicFormSubmitSchema = z.object({
  values: z.record(z.string(), z.string().nullable()),
});
