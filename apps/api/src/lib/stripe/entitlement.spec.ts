import {
  ANNUAL_DISCOUNT,
  accessForStatus,
  entitlementFor,
  hasFeature,
  isSubscriptionActive,
  resolveEntitlement,
  resolvePlan,
  seatCap,
} from "@dashboard/shared";
import { PLANS, getPlanLimits, priceForInterval } from "./plans";

describe("resolvePlan", () => {
  it("resolves the known tiers case insensitively", () => {
    expect(resolvePlan("growth")).toBe("growth");
    expect(resolvePlan("Scale")).toBe("scale");
  });

  // A typo or a plan removed from the catalog must not buy the top tier.
  it("falls back to the lowest tier for anything unknown", () => {
    expect(resolvePlan(null)).toBe("essentials");
    expect(resolvePlan(undefined)).toBe("essentials");
    expect(resolvePlan("")).toBe("essentials");
    expect(resolvePlan("enterprise")).toBe("essentials");
  });

  it("keeps the legacy plan name resolving", () => {
    expect(resolvePlan("dashboard")).toBe("essentials");
  });
});

describe("hasFeature", () => {
  it("gates ai above essentials", () => {
    expect(hasFeature("essentials", "ai")).toBe(false);
    expect(hasFeature("growth", "ai")).toBe(true);
    expect(hasFeature("scale", "ai")).toBe(true);
  });

  it("gates export above essentials", () => {
    expect(hasFeature("essentials", "export")).toBe(false);
    expect(hasFeature("growth", "export")).toBe(true);
    expect(hasFeature("scale", "export")).toBe(true);
  });

  it("keeps priority support on the top tier only", () => {
    expect(hasFeature("essentials", "priority_support")).toBe(false);
    expect(hasFeature("growth", "priority_support")).toBe(false);
    expect(hasFeature("scale", "priority_support")).toBe(true);
  });

  it("grants nothing for an unknown plan", () => {
    expect(hasFeature(null, "ai")).toBe(false);
    expect(hasFeature("enterprise", "export")).toBe(false);
  });
});

describe("seatCap", () => {
  it("rises with the tier", () => {
    expect(seatCap("essentials")).toBe(10);
    expect(seatCap("growth")).toBe(25);
    expect(seatCap("scale")).toBe(50);
  });

  it("uses the lowest cap when the plan is unknown", () => {
    expect(seatCap(null)).toBe(10);
  });
});

describe("accessForStatus", () => {
  // past_due is Stripe still retrying the card, so locking the organization out
  // during a retry window it will probably win would be self-inflicted.
  it("keeps a trialing, active or retrying subscription on full access", () => {
    expect(accessForStatus("trialing")).toBe("full");
    expect(accessForStatus("active")).toBe("full");
    expect(accessForStatus("past_due")).toBe("full");
  });

  // The records belong to the organization, and export is how it leaves.
  it("drops to read only once Stripe stops collecting", () => {
    expect(accessForStatus("unpaid")).toBe("read_only");
    expect(accessForStatus("canceled")).toBe("read_only");
    expect(accessForStatus("paused")).toBe("read_only");
  });

  it("locks an unfinished checkout and anything unrecognised", () => {
    expect(accessForStatus("incomplete")).toBe("locked");
    expect(accessForStatus("incomplete_expired")).toBe("locked");
    expect(accessForStatus("something_new")).toBe("locked");
    expect(accessForStatus(null)).toBe("locked");
    expect(accessForStatus(undefined)).toBe("locked");
  });
});

describe("isSubscriptionActive", () => {
  it("is the full-access statuses under another name", () => {
    expect(isSubscriptionActive("active")).toBe(true);
    expect(isSubscriptionActive("trialing")).toBe(true);
    expect(isSubscriptionActive("past_due")).toBe(true);
    expect(isSubscriptionActive("canceled")).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
  });
});

// The catalog renders limits as flags, so a drift here would show the customer
// one thing on the plan card and enforce another at the guard.
describe("plan catalog", () => {
  it("derives every tier's limits from the shared entitlements", () => {
    for (const plan of PLANS) {
      const entitlement = entitlementFor(plan.name);
      expect(plan.limits.seats).toBe(entitlement.seats);
      expect(plan.limits.ai).toBe(hasFeature(plan.name, "ai") ? 1 : 0);
      expect(plan.limits.exportCsv).toBe(
        hasFeature(plan.name, "export") ? 1 : 0
      );
      expect(plan.limits.prioritySupport).toBe(
        hasFeature(plan.name, "priority_support") ? 1 : 0
      );
    }
  });

  it("falls back to the lowest tier's limits for an unknown plan", () => {
    expect(getPlanLimits("enterprise")).toEqual(PLANS[0].limits);
  });
});

describe("purchased seats", () => {
  it("takes the seat ceiling from the subscription, not the tier", () => {
    expect(resolveEntitlement({ plan: "essentials", seats: 30 }).seats).toBe(
      30
    );
    expect(resolveEntitlement({ plan: "scale", seats: 3 }).seats).toBe(3);
  });

  // A row written before seats were purchased has none, and must not be capped
  // at zero members.
  it("falls back to the tier count when no seats are recorded", () => {
    expect(resolveEntitlement({ plan: "growth", seats: null }).seats).toBe(25);
    expect(resolveEntitlement({ plan: "growth" }).seats).toBe(25);
  });

  it("keeps a contract's own seat count ahead of purchased seats", () => {
    expect(
      resolveEntitlement({
        plan: "custom",
        seats: 5,
        isCustom: true,
        customLimits: { seats: 40, features: ["hipaa"] },
      }).seats
    ).toBe(40);
  });
});

describe("billing intervals", () => {
  it("discounts a yearly seat against twelve monthly ones", () => {
    for (const plan of PLANS) {
      const undiscounted = plan.monthly.pricePerSeat * 12;
      expect(plan.yearly.pricePerSeat).toBeLessThanOrEqual(
        undiscounted * (1 - ANNUAL_DISCOUNT)
      );
      expect(plan.yearly.pricePerSeat).toBeGreaterThan(undiscounted * 0.85);
    }
  });

  // A row predating yearly carries no interval, and that was monthly.
  it("treats a missing interval as monthly", () => {
    expect(priceForInterval(PLANS[0], null)).toBe(PLANS[0].monthly);
    expect(priceForInterval(PLANS[0], "year")).toBe(PLANS[0].yearly);
  });
});
