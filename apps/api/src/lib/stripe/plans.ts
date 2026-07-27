// Plan catalog: single source of truth for tiers, price IDs, and limits.
// TODO_LIVE: growth and scale price IDs are test placeholders, create the
// prices in Stripe and swap them before launch.

export type PlanLimits = {
  seats: number;
  ai: number;
  exportCsv: number;
  prioritySupport: number;
};

export type Plan = {
  name: string;
  label: string;
  monthlyPrice: number;
  monthlyPriceId: string;
  limits: PlanLimits;
  freeTrialDays: number;
};

export const PLANS: Plan[] = [
  {
    name: "essentials",
    label: "Essentials",
    monthlyPrice: 49,
    monthlyPriceId: "price_1SUpOoCVzwuBDRu4m7JnkjKf",
    limits: { seats: 10, ai: 0, exportCsv: 0, prioritySupport: 0 },
    freeTrialDays: 14,
  },
  {
    name: "growth",
    label: "Growth",
    monthlyPrice: 99,
    monthlyPriceId: "price_TODO_LIVE_growth_monthly",
    limits: { seats: 25, ai: 1, exportCsv: 1, prioritySupport: 0 },
    freeTrialDays: 14,
  },
  {
    name: "scale",
    label: "Scale",
    monthlyPrice: 149,
    monthlyPriceId: "price_TODO_LIVE_scale_monthly",
    limits: { seats: 50, ai: 1, exportCsv: 1, prioritySupport: 1 },
    freeTrialDays: 14,
  },
];

// Derived plugin list so auth and catalog cannot disagree on prices.
export const BETTER_AUTH_PLANS = [
  ...PLANS.map((plan) => ({
    name: plan.name,
    priceId: plan.monthlyPriceId,
    limits: plan.limits,
    freeTrial: { days: plan.freeTrialDays },
  })),
  // Legacy alias keeps existing "Dashboard" subscription rows resolving.
  {
    name: "dashboard",
    priceId: PLANS[0].monthlyPriceId,
    limits: PLANS[0].limits,
  },
];

export const getPlan = (name: string): Plan | undefined =>
  PLANS.find((plan) => plan.name === name.toLowerCase());
