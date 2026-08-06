import { hasFeature, isSubscriptionActive, seatCap } from "@dashboard/shared";
import { describe, expect, it } from "vitest";

// Mirrors apps/api/src/lib/stripe/entitlement.spec.ts so a plan gated one way in
// the API and another in the UI fails here rather than as a 403 the user sees.
describe("entitlements", () => {
  it("gates ai and export above the entry tier", () => {
    expect(hasFeature("essentials", "ai")).toBe(false);
    expect(hasFeature("essentials", "export")).toBe(false);
    expect(hasFeature("growth", "ai")).toBe(true);
    expect(hasFeature("growth", "export")).toBe(true);
  });

  it("keeps priority support on the top tier", () => {
    expect(hasFeature("growth", "priority_support")).toBe(false);
    expect(hasFeature("scale", "priority_support")).toBe(true);
  });

  // The compliance tab renders an upsell rather than the signing UI on the
  // same flag the API guard enforces.
  it("keeps HIPAA on the top tier", () => {
    expect(hasFeature("essentials", "hipaa")).toBe(false);
    expect(hasFeature("growth", "hipaa")).toBe(false);
    expect(hasFeature("scale", "hipaa")).toBe(true);
    expect(hasFeature(null, "hipaa")).toBe(false);
  });

  it("grants nothing when the plan is missing or unknown", () => {
    expect(hasFeature(null, "ai")).toBe(false);
    expect(hasFeature(undefined, "export")).toBe(false);
    expect(hasFeature("enterprise", "ai")).toBe(false);
  });

  it("reports the seat cap per tier", () => {
    expect(seatCap("essentials")).toBe(10);
    expect(seatCap("growth")).toBe(25);
    expect(seatCap("scale")).toBe(50);
    expect(seatCap(null)).toBe(10);
  });

  // The team layout redirects on the same rule the API guard enforces.
  it("treats only active and trialing as a live subscription", () => {
    expect(isSubscriptionActive("active")).toBe(true);
    expect(isSubscriptionActive("trialing")).toBe(true);
    expect(isSubscriptionActive("past_due")).toBe(false);
    expect(isSubscriptionActive("canceled")).toBe(false);
    expect(isSubscriptionActive(null)).toBe(false);
  });
});
