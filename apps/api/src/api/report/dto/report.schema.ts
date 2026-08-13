import { z } from "zod";

export const SaveReportSchema = z.object({
  name: z.string().trim().min(1).max(80),
  moduleId: z.string().uuid(),
  columnIds: z.array(z.string().uuid()).min(1),
  filter: z.record(z.string(), z.string()).default({}),
  // Rolling window evaluated at run time, so a saved report does not freeze to
  // the dates it was built on.
  rangeDays: z.number().int().positive().max(3650).nullable().default(null),
});

export const UpdateReportSchema = SaveReportSchema.partial();
