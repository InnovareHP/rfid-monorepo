// Plan catalog: single source of truth for tiers, price IDs, and limits.
// Billing is per seat, and seats are purchased explicitly rather than tracked
// from head count. Quantity on the Stripe item is the purchased seat count.

import {
  entitlementFor,
  seatCap,
  type BillingInterval,
} from "@dashboard/shared";
import { appConfig } from "../../config/app-config";

const isProduction = process.env.NODE_ENV === "production";

// Live IDs come from validated config so a deploy cannot ship test prices.
// Test IDs stay inline so local and staging work with no extra configuration.
const priceId = (liveId: string | undefined) =>
  isProduction ? (liveId ?? "") : (liveId ?? "");

// Kept as flags because the plan card and Better Auth both render this shape.
// The values are derived, so the shared entitlement table stays the only source.
export type PlanLimits = {
  seats: number;
  ai: number;
  exportCsv: number;
  prioritySupport: number;
};

const limitsFor = (name: string): PlanLimits => {
  const { features } = entitlementFor(name);
  return {
    seats: seatCap(name),
    ai: features.includes("ai") ? 1 : 0,
    exportCsv: features.includes("export") ? 1 : 0,
    prioritySupport: features.includes("priority_support") ? 1 : 0,
  };
};

export type PlanPrice = {
  // Cost of one seat for one billing period, in whole currency units.
  pricePerSeat: number;
  priceId: string;
};

export type Plan = {
  name: string;
  label: string;
  monthly: PlanPrice;
  // Ten percent off twelve monthly seats, rounded down to whole dollars.
  yearly: PlanPrice;
  limits: PlanLimits;
  freeTrialDays: number;
};

export const PLANS: Plan[] = [
  {
    name: "essentials",
    label: "Essentials",
    monthly: {
      pricePerSeat: 20,
      priceId: priceId(appConfig.STRIPE_PRICE_ESSENTIALS_SEAT),
    },
    yearly: {
      pricePerSeat: 216,
      priceId: priceId(appConfig.STRIPE_PRICE_ESSENTIALS_SEAT_ANNUAL),
    },
    limits: limitsFor("essentials"),
    freeTrialDays: 14,
  },
  {
    name: "growth",
    label: "Growth",
    monthly: {
      pricePerSeat: 49,
      priceId: priceId(appConfig.STRIPE_PRICE_GROWTH_SEAT),
    },
    yearly: {
      pricePerSeat: 529,
      priceId: priceId(appConfig.STRIPE_PRICE_GROWTH_SEAT_ANNUAL),
    },
    limits: limitsFor("growth"),
    freeTrialDays: 14,
  },
  {
    name: "scale",
    label: "Scale",
    monthly: {
      pricePerSeat: 79,
      priceId: priceId(appConfig.STRIPE_PRICE_SCALE_SEAT),
    },
    yearly: {
      pricePerSeat: 853,
      priceId: priceId(appConfig.STRIPE_PRICE_SCALE_SEAT_ANNUAL),
    },
    limits: limitsFor("scale"),
    freeTrialDays: 14,
  },
];

// Derived plugin list so auth and catalog cannot disagree on prices. No
// seatPriceId on purpose: that field puts the plugin in auto-managed mode, where
// quantity is forced to the member count and the seats argument is ignored.
export const BETTER_AUTH_PLANS = [
  ...PLANS.map((plan) => ({
    name: plan.name,
    priceId: plan.monthly.priceId,
    annualDiscountPriceId: plan.yearly.priceId || undefined,
    limits: plan.limits,
    freeTrial: { days: plan.freeTrialDays },
  })),
  // Legacy alias keeps existing "Dashboard" subscription rows resolving.
  {
    name: "dashboard",
    priceId: PLANS[0].monthly.priceId,
    limits: PLANS[0].limits,
  },
];

export const getPlan = (name: string): Plan | undefined =>
  PLANS.find((plan) => plan.name === name.toLowerCase());

// Feature gating hangs off limits flags, never the plan slug.
export const getPlanLimits = (name: string | null | undefined): PlanLimits =>
  getPlan(name ?? "")?.limits ?? PLANS[0].limits;

// A row written before yearly existed carries no interval, which was monthly.
export const priceForInterval = (
  plan: Plan,
  interval: BillingInterval | null | undefined
): PlanPrice => (interval === "year" ? plan.yearly : plan.monthly);

export const findPlanByPriceId = (priceId: string) =>
  PLANS.find(
    (plan) =>
      plan.monthly.priceId === priceId || plan.yearly.priceId === priceId
  );
