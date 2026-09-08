import { toSlug } from "@dashboard/shared";
import { z } from "zod";
import { MODULE_TEMPLATES, SELECT_FIELD_TYPES } from "./module-templates";

const columnSchema = z.object({
  fieldName: z.string().trim().min(1, "Column name is required").max(60),
  fieldType: z.string().min(1),
  options: z.array(z.string()).optional(),
});

// The choices rule lives here rather than in the Continue handler so it
// renders on the row that is wrong instead of as a toast.
export const moduleSetupSchema = z
  .object({
    label: z.string().trim().min(1, "Name is required").max(40),
    labelSingular: z.string().trim().min(1, "Singular name is required").max(40),
    icon: z.string().min(1),
    // Sidebar folder, picked by id. Empty means the module sits at the top
    // level.
    groupId: z.string(),
    fields: z.array(columnSchema).min(1, "A module needs at least one column"),
  })
  .superRefine((values, ctx) => {
    values.fields.forEach((row, index) => {
      if (SELECT_FIELD_TYPES.has(row.fieldType) && !row.options?.length) {
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "options"],
          message: "Add at least one choice",
        });
      }
    });
  });

export type ModuleFormValues = z.infer<typeof moduleSetupSchema>;

export type ModuleColumn = ModuleFormValues["fields"][number] & { id: string };

export const MODULE_STEPS = ["Name it", "Columns", "Review"] as const;

// The key lands in URLs and query keys, so it is shown before creation and
// frozen afterwards rather than being editable free text.
export const previewKey = (label: string) =>
  toSlug(label).replace(/-/g, "_").toUpperCase();

// Templates are readonly literals, so they are copied into mutable rows
// before the field array takes them.
export const templateFields = (value: string) =>
  (
    MODULE_TEMPLATES.find((template) => template.value === value) ??
    MODULE_TEMPLATES[2]
  ).fields.map((field) => ({
    fieldName: field.fieldName,
    fieldType: field.fieldType as string,
    options: "options" in field ? [...field.options] : [],
  }));
