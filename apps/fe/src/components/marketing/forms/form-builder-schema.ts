import { z } from "zod";

export const formBuilderSchema = z.object({
  name: z.string().trim().min(1, "Form name is required"),
  submitButtonText: z.string().trim().min(1, "Submit button text is required"),
  redirectUrl: z.union([z.literal(""), z.url("Enter a valid URL")]),
  fieldMappings: z
    .array(
      z.object({
        fieldId: z.string(),
        label: z.string().trim().min(1, "Field label is required"),
        required: z.boolean(),
      })
    )
    .min(1, "Add at least one field"),
});

export type FormBuilderValues = z.infer<typeof formBuilderSchema>;
