import { describe, expect, it } from "vitest";

import {
  autoMatchColumns,
  inferFieldType,
  suggestColumns,
} from "./csv-column-mapping";

const column = (id: string, name: string) => ({ id, name, type: "TEXT" });

describe("autoMatchColumns", () => {
  it("matches an exact header", () => {
    const columns = [column("f1", "Type of Facility")];

    expect(autoMatchColumns(["Type of Facility"], columns)).toEqual({
      "Type of Facility": "f1",
    });
  });

  it.each([
    ["Facility Type", "Type of Facility"],
    ["Facility Name", "Name of Facility"],
    ["facility type", "Type of Facility"],
    ["facility_type", "Type of Facility"],
  ])("matches %s onto %s regardless of word order", (header, fieldName) => {
    expect(autoMatchColumns([header], [column("f1", fieldName)])).toEqual({
      [header]: "f1",
    });
  });

  it.each([
    ["Beds", "Number of Beds"],
    ["Bed Count", "Number of Beds"],
    ["Faclity Type", "Type of Facility"],
    ["Phone", "Email"],
  ])("does not match %s onto %s", (header, fieldName) => {
    expect(autoMatchColumns([header], [column("f1", fieldName)])).toEqual({});
  });

  it("prefers the exact match over a token set match", () => {
    const columns = [
      column("token", "Type of Facility"),
      column("exact", "Facility Type"),
    ];

    expect(autoMatchColumns(["Facility Type"], columns)).toEqual({
      "Facility Type": "exact",
    });
  });

  it("matches nothing when two fields share a token set", () => {
    const columns = [
      column("f1", "Type of Facility"),
      column("f2", "Facility Type"),
    ];

    // "Type Facility" exact matches neither name, so only the poisoned token
    // set is left to resolve it and it must resolve to nothing.
    expect(autoMatchColumns(["Type Facility"], columns)).toEqual({});
  });

  it("still exact matches a field whose token set is ambiguous", () => {
    const columns = [
      column("f1", "Type of Facility"),
      column("f2", "Facility Type"),
    ];

    expect(autoMatchColumns(["Type of Facility"], columns)).toEqual({
      "Type of Facility": "f1",
    });
  });

  it("never maps two headers onto the same field", () => {
    const columns = [column("f1", "Type of Facility")];
    const result = autoMatchColumns(["Type of Facility", "Facility Type"], columns);

    expect(result).toEqual({ "Type of Facility": "f1" });
  });

  it("treats a repeated word as a distinct multiset", () => {
    expect(autoMatchColumns(["Name Name"], [column("f1", "Name")])).toEqual({});
  });

  it("ignores a header that is only stopwords", () => {
    expect(autoMatchColumns(["of the"], [column("f1", "For A")])).toEqual({});
  });
});

describe("suggestColumns", () => {
  const columns = [
    column("beds", "Number of Beds"),
    column("type", "Type of Facility"),
    column("email", "Email Address"),
  ];

  it("suggests a subset overlap", () => {
    const [first] = suggestColumns("Beds", columns, new Set());

    expect(first.name).toBe("Number of Beds");
  });

  it("suggests the typo case that must not auto-match", () => {
    const names = suggestColumns("Faclity Type", columns, new Set()).map(
      (s) => s.name
    );

    expect(names).toContain("Type of Facility");
  });

  it("skips a field another header already took", () => {
    expect(suggestColumns("Beds", columns, new Set(["beds"]))).toEqual([]);
  });

  it("returns nothing when no token is shared", () => {
    expect(suggestColumns("Zip Code", columns, new Set())).toEqual([]);
  });

  it("returns at most three ranked suggestions", () => {
    const many = [
      column("a", "Facility Type A"),
      column("b", "Facility Type B"),
      column("c", "Facility Type C"),
      column("d", "Facility Type D"),
    ];
    const result = suggestColumns("Facility Type", many, new Set());

    expect(result).toHaveLength(3);
    expect(result[0].score).toBeGreaterThanOrEqual(result[2].score);
  });
});

describe("inferFieldType", () => {
  it("defaults to TEXT when empty", () => {
    expect(inferFieldType([null, undefined, "  "])).toBe("TEXT");
  });

  it("infers NUMBER when every sample parses", () => {
    expect(inferFieldType(["12", 4, "0.5", null])).toBe("NUMBER");
  });

  it("falls back to TEXT on one non numeric sample", () => {
    expect(inferFieldType(["12", "n/a"])).toBe("TEXT");
  });

  it("infers DATE for separated date shapes", () => {
    expect(inferFieldType(["2026-01-04", "12/31/2025"])).toBe("DATE");
  });

  it("does not read a bare number as a date", () => {
    expect(inferFieldType(["5", "2026-01-04"])).toBe("TEXT");
  });

  it("never infers DROPDOWN from low cardinality", () => {
    expect(inferFieldType(["Yes", "No", "Yes", "No"])).toBe("TEXT");
  });
});
