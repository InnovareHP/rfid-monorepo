import { PLAN_FEATURES } from "@dashboard/shared";
import z from "zod";
import { MIN_SIGN_IN_LINK_REASON_LENGTH } from "../../../lib/auth/admin-sign-in-link";

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

// Admin provisioning: the account carries no credential, so the new owner
// enrols their own passkey from the login page. Only what the two rows need.
export const CreateAdminUserSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  organizationName: z.string().trim().min(1).max(120),
});

export type CreateAdminUserData = z.infer<typeof CreateAdminUserSchema>;

// A sign-in link is as strong as the account it opens, so it carries the same
// written reason impersonation does.
export const AdminSignInLinkSchema = z.object({
  reason: z.string().trim().min(MIN_SIGN_IN_LINK_REASON_LENGTH).max(500),
});

export type AdminSignInLinkData = z.infer<typeof AdminSignInLinkSchema>;
