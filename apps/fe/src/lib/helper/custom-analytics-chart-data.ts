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
  if (result.chartType !== "BAR" && result.chartType !== "PIE") return [];
  return result.data.map((row) => ({ name: row.name, count: row.value }));
}

export function toCategoryPieRows(result: CustomAnalyticResult): CategoryRow[] {
  if (result.chartType !== "BAR" && result.chartType !== "PIE") return [];
  return result.data.map((row) => ({ name: row.name, value: row.value }));
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
