import { BoardFieldType } from "@prisma/client";
import { z } from "zod";

// A sidebar folder the organization owns, picked by id. See
// module-group.schema.ts for the folder itself.
const groupId = z.uuid();

export const CreateModuleSchema = z.object({
  label: z.string().trim().min(1).max(40),
  labelSingular: z.string().trim().min(1).max(40),
  icon: z.string().trim().max(40).optional(),
  groupId: groupId.optional(),
  fields: z
    .array(
      z.object({
        fieldName: z.string().trim().min(1).max(60),
        fieldType: z.enum(BoardFieldType),
        // A DROPDOWN or STATUS column with no options renders an empty picker,
        // and Kanban groups by the first STATUS field, so it would also produce
        // a board with no columns.
        options: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
      })
    )
    .min(1),
});

// Everything a module can change after creation. The key is derived from the
// first label and frozen, since it lands in urls, query keys and saved links.
export const UpdateModuleSchema = z
  .object({
    label: z.string().trim().min(1).max(40),
    labelSingular: z.string().trim().min(1).max(40),
    icon: z.string().trim().max(40),
    // Null clears the folder and returns the module to the top level.
    groupId: groupId.nullable(),
    isArchived: z.boolean(),
  })
  .partial();

export const ReorderModulesSchema = z.object({
  moduleIds: z.array(z.uuid()).min(1).max(50),
});
