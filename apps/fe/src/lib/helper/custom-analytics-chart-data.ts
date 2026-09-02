import type {
  CategoryRow,
  MonthlyPoint,
  RankedRow,
} from "@/lib/helper/analytics-chart-data";
import type { CustomAnalyticResult } from "@/services/custom-analytics/custom-analytics-service";
import { format, parseISO } from "date-fns";

// OWNER/DATE-mode BAR/PIE grouping shares the same {name,value}[] shape as
// FIELD-mode grouping, so one mapper covers all three dimension types.
export function toRankedBarRows(result: CustomAnalyticResult): RankedRow[] {
  if (!isGrouped(result)) return [];
  return result.data.map((row) => ({ name: row.name, count: row.value }));
}

// BAR, PIE and MAP share one grouped shape; only the rendering differs.
function isGrouped(
  result: CustomAnalyticResult
): result is Extract<CustomAnalyticResult, { data: { name: string }[] }> {
  return (
    result.chartType === "BAR" ||
    result.chartType === "PIE" ||
    result.chartType === "MAP"
  );
}

export function toCategoryPieRows(result: CustomAnalyticResult): CategoryRow[] {
  if (!isGrouped(result)) return [];
  return result.data.map((row) => ({
    name: row.name,
    value: row.value,
    color: row.color,
  }));
}

// The heat map counts by county name, the shape the legacy page passed it.
export function toCountyCounts(result: CustomAnalyticResult) {
  if (!isGrouped(result)) return [];
  return result.data.map((row) => ({
    value: row.name,
    _count: { value: row.value },
  }));
}

// A KPI's sparkline points, empty for any other chart type.
export function toKpiSeries(result: CustomAnalyticResult): MonthlyPoint[] {
  if (result.chartType !== "KPI") return [];
  return result.series.map((point) => ({
    month: point.bucket,
    label: bucketLabel(point.bucket),
    total: point.value,
  }));
}

// A LINE bucket is "yyyy-MM" (month) or "yyyy-MM-dd" (day/week), so the label
// format is picked from the string's shape rather than the request's bucket
// size, which this pure mapper never receives.
function bucketLabel(bucket: string): string {
  return bucket.length === 7
    ? format(parseISO(`${bucket}-01`), "MMM yyyy")
    : format(parseISO(bucket), "MMM d");
}

export function toTrendLineRows(result: CustomAnalyticResult): MonthlyPoint[] {
  if (result.chartType !== "LINE") return [];
  return result.data.map((point) => ({
    month: point.bucket,
    label: bucketLabel(point.bucket),
    total: point.value,
  }));
}

export function toKpiValue(result: CustomAnalyticResult | undefined): number {
  return result?.chartType === "KPI" ? result.value : 0;
}
