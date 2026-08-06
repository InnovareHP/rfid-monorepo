// What a plan buys. Prices and Stripe price ids stay in the API catalog because
// they read validated config; the limits live here so both apps gate on one table.

export const PLAN_FEATURES = [
  "ai",
  "export",
  "priority_support",
  "hipaa",
] as const;

export type PlanFeature = (typeof PLAN_FEATURES)[number];

export type PlanEntitlement = {
  seats: number;
  features: readonly PlanFeature[];
};

export const PLAN_ENTITLEMENTS = {
  essentials: { seats: 10, features: [] },
  growth: { seats: 25, features: ["ai", "export"] },
  scale: {
    seats: 50,
    features: ["ai", "export", "priority_support", "hipaa"],
  },
} as const satisfies Record<string, PlanEntitlement>;

export type PlanName = keyof typeof PLAN_ENTITLEMENTS;

// Existing rows carry the pre-tier plan name, which buys the lowest tier.
const LEGACY_PLAN_ALIASES: Record<string, PlanName> = {
  dashboard: "essentials",
};

const FALLBACK: PlanName = "essentials";

// An unknown, missing or misspelled plan buys the least, never the most.
export const resolvePlan = (name: string | null | undefined): PlanName => {
  const key = name?.toLowerCase() ?? "";
  if (key in PLAN_ENTITLEMENTS) return key as PlanName;
  return LEGACY_PLAN_ALIASES[key] ?? FALLBACK;
};

export const entitlementFor = (name: string | null | undefined) =>
  PLAN_ENTITLEMENTS[resolvePlan(name)] as PlanEntitlement;

export const hasFeature = (
  name: string | null | undefined,
  feature: PlanFeature
) => entitlementFor(name).features.includes(feature);

export const seatCap = (name: string | null | undefined) =>
  entitlementFor(name).seats;

// Only these keep a paid seat working. past_due is excluded deliberately, so a
// failed renewal closes feature access while the billing routes stay reachable.
export const ACTIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"] as const;

export const isSubscriptionActive = (status: string | null | undefined) =>
  ACTIVE_SUBSCRIPTION_STATUSES.includes(
    status as (typeof ACTIVE_SUBSCRIPTION_STATUSES)[number]
  );
