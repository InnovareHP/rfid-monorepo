// @vitest-environment jsdom
import type { CustomAnalyticResult } from "@/services/custom-analytics/custom-analytics-service";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CustomAnalyticsPreview } from "./custom-analytics-preview";

// Vitest runs without `globals`, so testing-library never auto-registers its
// own cleanup and mounted DOM would otherwise leak into the next test.
afterEach(cleanup);

// Builds a TABLE result with `count` rows so pagination has real pages to move through.
function tableResult(count: number): CustomAnalyticResult {
  return {
    chartType: "TABLE",
    columns: [{ id: "f1", fieldName: "Field 1", fieldType: "TEXT" }],
    rows: Array.from({ length: count }, (_, i) => ({
      id: `row-${i}`,
      recordName: `Record ${i}`,
      createdAt: new Date().toISOString(),
      values: { f1: `value-${i}` },
    })),
  };
}

describe("CustomAnalyticsPreview TABLE pagination", () => {
  it("resets to page 1 when switching to a chart with fewer rows than the current page held", () => {
    const { rerender } = render(
      <CustomAnalyticsPreview
        result={tableResult(15)}
        name="Chart A"
        metricLabel="Chart A"
      />
    );

    // Page size defaults to 10, so 15 rows gives a real page 2 to move to.
    fireEvent.click(screen.getByLabelText("Next page"));
    expect(screen.getByText("Record 10")).toBeTruthy();

    // Switching to a different saved chart re-renders the same component
    // instance (no key change) with a result that only has 3 rows.
    rerender(
      <CustomAnalyticsPreview
        result={tableResult(3)}
        name="Chart B"
        metricLabel="Chart B"
      />
    );

    // The new chart has 3 real rows, so they should be visible rather than
    // a false "no records" state left over from the previous chart's page 2.
    expect(screen.getByText("Record 0")).toBeTruthy();
    expect(screen.queryByText("This chart matched no records")).toBeNull();
  });
});

describe("CustomAnalyticsPreview TABLE thumbnail", () => {
  it("summarises the row count instead of rendering a paginated table", () => {
    render(
      <CustomAnalyticsPreview
        result={tableResult(15)}
        name="Chart A"
        metricLabel="Chart A"
        variant="thumbnail"
      />
    );

    // A thumbnail's signal is how much data matched, not the rows themselves.
    expect(screen.getByText("15")).toBeTruthy();
    expect(screen.getByText(/records across 1 column/)).toBeTruthy();

    // Pagination controls inside a click-through card would be dead weight.
    expect(screen.queryByLabelText("Next page")).toBeNull();
    expect(screen.queryByText("Record 0")).toBeNull();
  });
});
