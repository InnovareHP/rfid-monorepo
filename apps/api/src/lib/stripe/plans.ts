// Plan catalog: single source of truth for tiers, price IDs, and limits.
// Billing is per seat — one seat per organization member. The Better Auth
// stripe plugin syncs the seat quantity to Stripe whenever membership changes.

import { appConfig } from "../../config/app-config";

const isProduction = process.env.NODE_ENV === "production";

// Live IDs come from validated config so a deploy cannot ship test prices.
// Test IDs stay inline so local and staging work with no extra configuration.
const priceId = (testId: string, liveId: string | undefined) =>
  isProduction ? (liveId ?? "") : testId;

export type PlanLimits = {
  seats: number;
  ai: number;
  exportCsv: number;
  prioritySupport: number;
};

export type Plan = {
  name: string;
  label: string;
  // Monthly cost of one seat, in whole currency units.
  pricePerSeat: number;
  // One recurring price per tier, billed by quantity = member count. The plugin
  // reads priceId === seatPriceId as a seat-only plan and emits a single line
  // item, so the invoice is exactly pricePerSeat x seats with no base fee.
  seatPriceId: string;
  limits: PlanLimits;
  freeTrialDays: number;
};

export const PLANS: Plan[] = [
  {
    name: "essentials",
    label: "Essentials",
    pricePerSeat: 20,
    seatPriceId: priceId(
      "price_1SUpOoCVzwuBDRu4m7JnkjKf",
      appConfig.STRIPE_PRICE_ESSENTIALS_SEAT
    ),
    limits: { seats: 10, ai: 0, exportCsv: 0, prioritySupport: 0 },
    freeTrialDays: 14,
  },
  {
    name: "growth",
    label: "Growth",
    pricePerSeat: 49,
    seatPriceId: priceId(
      "price_TODO_TEST_growth_seat",
      appConfig.STRIPE_PRICE_GROWTH_SEAT
    ),
    limits: { seats: 25, ai: 1, exportCsv: 1, prioritySupport: 0 },
    freeTrialDays: 14,
  },
  {
    name: "scale",
    label: "Scale",
    pricePerSeat: 79,
    seatPriceId: priceId(
      "price_TODO_TEST_scale_seat",
      appConfig.STRIPE_PRICE_SCALE_SEAT
    ),
    limits: { seats: 50, ai: 1, exportCsv: 1, prioritySupport: 1 },
    freeTrialDays: 14,
  },
];

// Derived plugin list so auth and catalog cannot disagree on prices. priceId
// and seatPriceId are the same value by construction — that equality is what
// selects the plugin's seat-only branch, so it must not drift.
export const BETTER_AUTH_PLANS = [
  ...PLANS.map((plan) => ({
    name: plan.name,
    priceId: plan.seatPriceId,
    seatPriceId: plan.seatPriceId,
    limits: plan.limits,
    freeTrial: { days: plan.freeTrialDays },
  })),
  // Legacy alias keeps existing "Dashboard" subscription rows resolving.
  {
    name: "dashboard",
    priceId: PLANS[0].seatPriceId,
    seatPriceId: PLANS[0].seatPriceId,
    limits: PLANS[0].limits,
  },
];

export const getPlan = (name: string): Plan | undefined =>
  PLANS.find((plan) => plan.name === name.toLowerCase());

// Feature gating hangs off limits flags, never the plan slug.
export const getPlanLimits = (name: string | null | undefined): PlanLimits =>
  getPlan(name ?? "")?.limits ?? PLANS[0].limits;
