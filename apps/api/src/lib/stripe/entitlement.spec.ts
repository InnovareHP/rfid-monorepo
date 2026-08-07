import {
  entitlementFor,
  hasFeature,
  isSubscriptionActive,
  resolvePlan,
  seatCap,
} from "@dashboard/shared";
import { PLANS, getPlanLimits } from "./plans";

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

describe("isSubscriptionActive", () => {
  it("accepts only a paid or trialing seat", () => {
    expect(isSubscriptionActive("active")).toBe(true);
    expect(isSubscriptionActive("trialing")).toBe(true);
  });

  // past_due closes feature access; the billing routes stay reachable so the
  // organization can pay its way back in.
  it("refuses past_due, canceled and missing", () => {
    expect(isSubscriptionActive("past_due")).toBe(false);
    expect(isSubscriptionActive("canceled")).toBe(false);
    expect(isSubscriptionActive("incomplete_expired")).toBe(false);
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
