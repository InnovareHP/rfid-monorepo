import { BoardFieldType } from "@prisma/client";
import { z } from "zod";

export const CreateModuleSchema = z.object({
  label: z.string().trim().min(1).max(40),
  labelSingular: z.string().trim().min(1).max(40),
  icon: z.string().trim().max(40).optional(),
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
