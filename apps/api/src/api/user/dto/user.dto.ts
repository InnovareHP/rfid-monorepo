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
      // Cents, matching every other money column. Zero is legitimate: a pilot
      // or a comped account is a contract with no invoice.
      priceCents: z.number().int().min(0).max(100_000_000),
      setupFeeCents: z.number().int().min(0).max(100_000_000).default(0),
      billingInterval: z.enum(["monthly", "annual"]),
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
