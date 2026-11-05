import { defaultFilterOperator, matchesFilter } from "@dashboard/shared";
import { describe, expect, it } from "vitest";

describe("matchesFilter", () => {
  it("compares case-insensitively and treats missing values as empty", () => {
    expect(matchesFilter("is", "A@Acme.com", "a@acme.com")).toBe(true);
    expect(matchesFilter("is_not", "a@acme.com", "b@acme.com")).toBe(true);
    expect(matchesFilter("contains", "a@acme.com", "ACME")).toBe(true);
    expect(matchesFilter("not_contains", "a@acme.com", "gmail")).toBe(true);
    expect(matchesFilter("not_contains", null, "gmail")).toBe(true);
    expect(matchesFilter("is_empty", null, "")).toBe(true);
    expect(matchesFilter("is_empty", "  ", "")).toBe(true);
    expect(matchesFilter("is_not_empty", "x", "")).toBe(true);
    expect(matchesFilter("is_not_empty", undefined, "")).toBe(false);
  });

  it("keeps the old behaviour for groups saved without operators", () => {
    expect(defaultFilterOperator("DROPDOWN")).toBe("is");
    expect(defaultFilterOperator("TEXT")).toBe("contains");
    expect(defaultFilterOperator(undefined)).toBe("contains");
  });
});
