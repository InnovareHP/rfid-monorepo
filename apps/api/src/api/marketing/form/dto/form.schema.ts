import { z } from "zod";

export const FieldMappingSchema = z.object({
  fieldId: z.string(),
  label: z.string().min(1),
  required: z.boolean().default(false),
});

// Raw fields carry no .default(): a default still resolves when the key is
// omitted, even under .partial(), so an update built that way could not tell
// "not sent" from "sent as its default" and rebound every form to LEAD.
const nameField = z.string().min(1);
const campaignIdField = z.string();
const moduleTypeField = z.string();
const fieldMappingsField = z.array(FieldMappingSchema).min(1);
const submitButtonTextField = z.string();
const redirectUrlField = z.url({ protocol: /^https?$/ });

export const CreateFormSchema = z.object({
  name: nameField,
  campaignId: campaignIdField.optional(),
  moduleType: moduleTypeField.default("LEAD"),
  fieldMappings: fieldMappingsField,
  submitButtonText: submitButtonTextField.default("Submit"),
  redirectUrl: redirectUrlField.optional(),
});

export const UpdateFormSchema = z.object({
  name: nameField.optional(),
  campaignId: campaignIdField.optional(),
  moduleType: moduleTypeField.optional(),
  fieldMappings: fieldMappingsField.optional(),
  submitButtonText: submitButtonTextField.optional(),
  redirectUrl: redirectUrlField.optional(),
});

export const PublicFormSubmitSchema = z.object({
  values: z.record(z.string(), z.string().nullable()),
});
