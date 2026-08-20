import { PLAN_FEATURES } from "@dashboard/shared";
import z from "zod";

// A contract is present or it is null; there is no half-specified state. A grant
// missing its seats would resolve to the lowest tier rather than erroring, so the
// nested object makes every field required together.
export const AdminEntitlementSchema = z.object({
  contract: z
    .object({
      label: z.string().trim().min(1).max(80),
      seats: z.number().int().min(1).max(10000),
      features: z.array(z.enum(PLAN_FEATURES)),
    })
    .nullable(),
});

export type AdminEntitlementData = z.infer<typeof AdminEntitlementSchema>;

export const OnboardingSchema = z.object({
  foundUsOn: z.string(),
  organizationName: z.string(),
  brandColor: z.string(),
  logo: z.string().optional(),
});

export type OnboardingData = z.infer<typeof OnboardingSchema>;
