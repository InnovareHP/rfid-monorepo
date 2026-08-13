// What a plan buys. Prices and Stripe price ids stay in the API catalog because
// they read validated config; the limits live here so both apps gate on one table.

export const PLAN_FEATURES = [
  "ai",
  "export",
  "advanced_analytics",
  "custom_reporting",
  "priority_support",
  "hipaa",
] as const;

export type PlanFeature = (typeof PLAN_FEATURES)[number];

// What a gated feature is called wherever it is shown or refused, so the plans
// page cannot advertise something the guards do not grant.
export const PLAN_FEATURE_LABELS: Record<PlanFeature, string> = {
  ai: "AI insights, lead analysis & Smart Scan",
  export: "CSV import & export",
  advanced_analytics: "Advanced analytics & reporting",
  custom_reporting: "Custom reports & dashboards",
  priority_support: "Priority support",
  hipaa: "HIPAA mode & BAA",
};

export type PlanEntitlement = {
  seats: number;
  features: readonly PlanFeature[];
};

export const PLAN_ENTITLEMENTS = {
  essentials: { seats: 10, features: [] },
  growth: { seats: 25, features: ["ai", "export", "advanced_analytics"] },
  scale: {
    seats: 50,
    features: [
      "ai",
      "export",
      "advanced_analytics",
      "custom_reporting",
      "priority_support",
      "hipaa",
    ],
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

// ─── Custom contracts ────────────────────────────────────────────────
// A negotiated contract stores its entitlements on the subscription row rather
// than keying into the table above. Every gate resolves through the functions
// below and never reads sub.plan, so a contract can carry any feature set
// without being a tier.

export type CustomLimits = {
  seats: number;
  features: readonly PlanFeature[];
};

export type SubscriptionLike = {
  plan: string | null;
  isCustom?: boolean | null;
  contractLabel?: string | null;
  customLimits?: unknown;
};

export type ResolvedEntitlement = {
  seats: number;
  features: readonly PlanFeature[];
  label: string;
  isCustom: boolean;
};

const isPlanFeature = (value: unknown): value is PlanFeature =>
  PLAN_FEATURES.includes(value as PlanFeature);

// Validated on the way out of the database, not just on the way in: the column
// is JSON, and anything writing it outside the provisioning route bypasses that
// route's schema.
export const parseCustomLimits = (value: unknown): CustomLimits | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const seats = raw.seats;
  if (typeof seats !== "number" || !Number.isInteger(seats) || seats < 1) {
    return null;
  }

  const features = Array.isArray(raw.features)
    ? raw.features.filter(isPlanFeature)
    : [];

  return { seats, features };
};

// An unreadable contract falls back to the tier table, which for the "custom"
// plan name means the lowest tier — a broken contract buys the least, never
// the most.
export const resolveEntitlement = (
  subscription: SubscriptionLike | null | undefined
): ResolvedEntitlement => {
  const limits = subscription?.isCustom
    ? parseCustomLimits(subscription.customLimits)
    : null;

  if (limits) {
    return {
      seats: limits.seats,
      features: limits.features,
      label: subscription?.contractLabel?.trim() || "Custom",
      isCustom: true,
    };
  }

  const tier = entitlementFor(subscription?.plan);
  return {
    seats: tier.seats,
    features: tier.features,
    label: resolvePlan(subscription?.plan),
    isCustom: false,
  };
};

export const entitlementHasFeature = (
  entitlement: ResolvedEntitlement,
  feature: PlanFeature
) => entitlement.features.includes(feature);
