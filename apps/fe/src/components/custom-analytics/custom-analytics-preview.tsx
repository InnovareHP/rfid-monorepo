import { CategoryPie } from "@/components/analytics/charts/category-pie";
import { KpiStatTile } from "@/components/analytics/charts/kpi-stat-tile";
import { RankedBar } from "@/components/analytics/charts/ranked-bar";
import { TrendLine } from "@/components/analytics/charts/trend-line";
import {
  ReportTable,
  type ReportColumn,
} from "@/components/reusable-table/report-table";
import { monthOverMonthDelta } from "@/lib/helper/analytics-chart-data";
import {
  toCategoryPieRows,
  toCountyCounts,
  toKpiSeries,
  toKpiValue,
  toRankedBarRows,
  toTrendLineRows,
} from "@/lib/helper/custom-analytics-chart-data";
import type { CustomAnalyticResult } from "@/services/custom-analytics/custom-analytics-service";
import { lazy, Suspense, useState } from "react";

// maplibre is far too heavy to sit in the chunk every chart tile imports.
const CountyHeatMap = lazy(() => import("@/components/analytics/county-heat-map"));

type TableRow = Extract<
  CustomAnalyticResult,
  { chartType: "TABLE" }
>["rows"][number];

type CustomAnalyticsPreviewProps = {
  result: CustomAnalyticResult;
  name: string;
  metricLabel: string;
  variant?: "full" | "thumbnail";
};

// A preview's row count is capped small, so this component owns pagination
// locally and slices the returned rows rather than round-tripping to the API.
export function CustomAnalyticsPreview({
  result,
  name,
  metricLabel,
  variant = "full",
}: CustomAnalyticsPreviewProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isThumbnail = variant === "thumbnail";

  switch (result.chartType) {
    case "BAR":
      return (
        <RankedBar
          data={toRankedBarRows(result)}
          metricLabel={metricLabel}
          layout="horizontal"
          compact={isThumbnail}
        />
      );

    case "PIE":
      return (
        <CategoryPie data={toCategoryPieRows(result)} compact={isThumbnail} />
      );

    case "LINE":
      return <TrendLine data={toTrendLineRows(result)} compact={isThumbnail} />;

    case "MAP": {
      const counties = toCountyCounts(result);

      // A thumbnail cannot show geography usefully, and loading maplibre for a
      // 160px card is not worth it.
      if (isThumbnail) {
        return (
          <div className="flex h-40 flex-col items-center justify-center gap-1">
            <p className="text-4xl font-bold tabular-nums text-foreground">
              {counties.length.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              {counties.length === 1 ? "county" : "counties"}
            </p>
          </div>
        );
      }

      return (
        <Suspense
          fallback={
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground sm:h-[450px]">
              Loading map...
            </div>
          }
        >
          <CountyHeatMap counties={counties} />
        </Suspense>
      );
    }

    case "KPI": {
      const series = toKpiSeries(result);
      // A PERCENT chart is a rate, so it reads as one instead of a bare number.
      const suffix = result.unit === "percent" ? "%" : "";
      const formatted = `${toKpiValue(result).toLocaleString(undefined, {
        maximumFractionDigits: 2,
      })}${suffix}`;

      // KpiStatTile renders its own Card, which would double-border inside the
      // list card, and its sizing is built for a full stat row.
      return isThumbnail ? (
        <div className="flex h-40 flex-col items-center justify-center gap-1">
          <p className="text-4xl font-bold tabular-nums text-foreground">
            {formatted}
          </p>
          <p className="text-sm text-muted-foreground">{name}</p>
        </div>
      ) : (
        <KpiStatTile
          label={name}
          value={formatted}
          seriesLabel={metricLabel}
          delta={monthOverMonthDelta(series)}
          series={series}
        />
      );
    }

    case "TABLE": {
      // A table's at-a-glance signal is how much data matched; a real table at
      // 160px shows one truncated row plus dead pagination controls.
      if (isThumbnail) {
        return (
          <div className="flex h-40 flex-col items-center justify-center gap-1">
            <p className="text-4xl font-bold tabular-nums text-foreground">
              {result.rows.length.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">
              {result.rows.length === 1 ? "record" : "records"} across{" "}
              {result.columns.length} column
              {result.columns.length === 1 ? "" : "s"}
            </p>
          </div>
        );
      }

      const columns: ReportColumn<TableRow>[] = [
        { key: "recordName", header: "Name", render: (row) => row.recordName },
        ...result.columns.map((column) => ({
          key: column.id,
          header: column.fieldName,
          render: (row: TableRow) => row.values[column.id] ?? "—",
        })),
      ];

      // Clamp to the result's actual page count during render so a stale
      // `page` from a previous (larger) result never hides real rows.
      const totalPages = Math.max(1, Math.ceil(result.rows.length / pageSize));
      const safePage = Math.min(page, totalPages);

      return (
        <ReportTable
          columns={columns}
          rows={result.rows.slice(
            (safePage - 1) * pageSize,
            safePage * pageSize
          )}
          emptyMessage="This chart matched no records"
          currentPage={safePage}
          pageSize={pageSize}
          totalCount={result.rows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      );
    }
  }
}
