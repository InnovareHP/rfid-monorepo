import { z } from "zod";

export const SaveDashboardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  analyticIds: z.array(z.string().uuid()).default([]),
});

export const UpdateDashboardSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  analyticIds: z.array(z.string().uuid()).optional(),
});

// Duplicates are rejected here so the service's length-vs-set-size comparison
// is a sound set-equality test.
export const ReorderDashboardChartsSchema = z.object({
  analyticIds: z
    .array(z.string().uuid())
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "analyticIds must not contain duplicates",
    }),
});
