import { z } from "zod";

export const GetPlanSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  skip: z.coerce.number().min(1).default(10),
  orderBy: z.string().optional(),
  sortBy: z.string().optional(),
  type: z.string().optional(),
  role: z.string().optional(),
});
