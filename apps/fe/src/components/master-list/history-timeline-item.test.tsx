import { describe, expect, it } from "vitest";
import {
  formatHistoryValue,
  groupHistory,
  type HistoryItem,
} from "./history-timeline-item";

const row = (
  id: string,
  column: string,
  groupId: string | null = null
): HistoryItem => ({
  id,
  action: "update",
  column,
  oldValue: "before",
  newValue: "after",
  createdBy: "Jane Doe",
  createdAt: "2026-09-05T10:00:00.000Z",
  groupId,
});

describe("groupHistory", () => {
  it("folds the rows of one status change into a single entry", () => {
    const groups = groupHistory([
      row("h1", "Admission Status", "g1"),
      row("h2", "Reason", "g1"),
      row("h3", "Action Date", "g1"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].map((item) => item.column)).toEqual([
      "Admission Status",
      "Reason",
      "Action Date",
    ]);
  });

  // History written before groupId existed has to read exactly as it did.
  it("leaves ungrouped rows on their own", () => {
    const groups = groupHistory([
      row("h1", "Payor"),
      row("h2", "Assessor"),
    ]);

    expect(groups.map((group) => group.length)).toEqual([1, 1]);
  });

  it("keeps separate changes apart", () => {
    const groups = groupHistory([
      row("h1", "Admission Status", "g2"),
      row("h2", "Reason", "g2"),
      row("h3", "Admission Status", "g1"),
      row("h4", "Reason", "g1"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0][0].id).toBe("h1");
    expect(groups[1][0].id).toBe("h3");
  });

  // Paging can put a group's rows either side of a row from another action.
  it("reunites a group split across the list", () => {
    const groups = groupHistory([
      row("h1", "Admission Status", "g1"),
      row("h2", "Payor"),
      row("h3", "Reason", "g1"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].map((item) => item.id)).toEqual(["h1", "h3"]);
    expect(groups[1].map((item) => item.id)).toEqual(["h2"]);
  });

  it("preserves newest-first order", () => {
    const groups = groupHistory([
      row("h1", "Payor"),
      row("h2", "Admission Status", "g1"),
    ]);

    expect(groups.map((group) => group[0].id)).toEqual(["h1", "h2"]);
  });

  it("returns nothing for an empty list", () => {
    expect(groupHistory([])).toEqual([]);
  });
});

describe("formatHistoryValue", () => {
  it("renders a date field's value as a readable day", () => {
    expect(formatHistoryValue("2026-09-04")).toBe("4 September 2026");
  });

  // Status changes stamped a full timestamp into the Action Date field before
  // that was fixed, so those rows still have to read properly.
  it("renders a legacy full timestamp as a day", () => {
    expect(formatHistoryValue("2026-09-04T20:22:00.951Z")).toBe(
      "4 September 2026"
    );
  });

  it("leaves an ordinary value alone", () => {
    expect(formatHistoryValue("Denied")).toBe("Denied");
    expect(formatHistoryValue("Patient did not show")).toBe(
      "Patient did not show"
    );
  });

  // A value that merely looks numeric must not be mangled into a date.
  it("leaves a non-date alone even when it has digits and dashes", () => {
    expect(formatHistoryValue("555-1234")).toBe("555-1234");
    expect(formatHistoryValue("2026-13-45")).toBe("2026-13-45");
  });

  it("passes an empty value straight through", () => {
    expect(formatHistoryValue(null)).toBeNull();
    expect(formatHistoryValue("")).toBe("");
  });
});
