import {
  EMPTY_FILTER,
  filterFieldIds,
  matchesFilter,
  parseFilter,
  type AnalyticFilter,
} from "./analytic-filter";

const FIELD = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const filter = (
  conditions: AnalyticFilter["conditions"],
  match: AnalyticFilter["match"] = "AND"
): AnalyticFilter => ({ match, conditions });

const one = (operator: string, value: string) =>
  filter([{ fieldId: FIELD, operator: operator as never, value }]);

describe("parseFilter", () => {
  it("reads the stored condition shape", () => {
    const stored = filter(
      [{ fieldId: FIELD, operator: "contains", value: "a" }],
      "OR"
    );

    expect(parseFilter(stored)).toEqual(stored);
  });

  it("reads a pre-migration filter as AND equality", () => {
    expect(parseFilter({ [FIELD]: "Won", [OTHER]: "" })).toEqual({
      match: "AND",
      conditions: [{ fieldId: FIELD, operator: "eq", value: "Won" }],
    });
  });

  it("treats anything else as unfiltered", () => {
    expect(parseFilter(null)).toEqual(EMPTY_FILTER);
    expect(parseFilter("nonsense")).toEqual(EMPTY_FILTER);
  });
});

describe("filterFieldIds", () => {
  it("lists each field a condition reads, once", () => {
    const both = filter([
      { fieldId: FIELD, operator: "eq", value: "a" },
      { fieldId: FIELD, operator: "neq", value: "b" },
      { fieldId: OTHER, operator: "isEmpty", value: "" },
    ]);

    expect(filterFieldIds(both)).toEqual([FIELD, OTHER]);
  });
});

describe("matchesFilter", () => {
  it("matches everything when there are no conditions", () => {
    expect(matchesFilter(EMPTY_FILTER, {})).toBe(true);
    expect(matchesFilter(filter([], "OR"), { [FIELD]: null })).toBe(true);
  });

  it.each([
    ["eq", "Won", "Won", true],
    ["eq", "Won", "Lost", false],
    ["neq", "Won", "Lost", true],
    ["contains", "on", "Won", true],
    ["contains", "WON", "won", true],
    ["contains", "zz", "Won", false],
    ["in", "Won, Lost", "Lost", true],
    ["in", "Won,Lost", "Open", false],
    ["gt", "10", "11", true],
    ["gt", "10", "10", false],
    ["lt", "10", "9", true],
    ["gt", "10", "abc", false],
  ])("%s %s against %s", (operator, value, cell, expected) => {
    expect(matchesFilter(one(operator, value), { [FIELD]: cell })).toBe(
      expected
    );
  });

  it("treats a missing value and an empty string alike for emptiness", () => {
    expect(matchesFilter(one("isEmpty", ""), { [FIELD]: null })).toBe(true);
    expect(matchesFilter(one("isEmpty", ""), { [FIELD]: "" })).toBe(true);
    expect(matchesFilter(one("isEmpty", ""), { [FIELD]: "Won" })).toBe(false);
    expect(matchesFilter(one("isNotEmpty", ""), { [FIELD]: "Won" })).toBe(true);
    expect(matchesFilter(one("isNotEmpty", ""), {})).toBe(false);
  });

  it("requires every condition under AND and any under OR", () => {
    const conditions = [
      { fieldId: FIELD, operator: "eq" as const, value: "Won" },
      { fieldId: OTHER, operator: "eq" as const, value: "High" },
    ];
    const values = { [FIELD]: "Won", [OTHER]: "Low" };

    expect(matchesFilter(filter(conditions), values)).toBe(false);
    expect(matchesFilter(filter(conditions, "OR"), values)).toBe(true);
  });

  // The old flat filter compared row.values[fieldId], which only held the
  // metric, dimension and table columns — so filtering on any other field
  // dropped every row. Conditions carry their field into the record load, and
  // this pins the semantics an absent value now has.
  it("reads an absent value as null rather than matching nothing", () => {
    expect(matchesFilter(one("neq", "Won"), {})).toBe(true);
    expect(matchesFilter(one("eq", "Won"), {})).toBe(false);
  });
});
