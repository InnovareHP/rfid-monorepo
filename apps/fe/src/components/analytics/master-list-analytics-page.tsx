import { FeatureLocked } from "@/components/feature-locked";
import { PageHeader } from "@/components/page-header";
import { useEntitlement } from "@/hooks/use-entitlement";
import { buildMasterListChartData } from "@/lib/helper/analytics-chart-data";
import { getApiErrorMessage } from "@/lib/helper/helper";
import {
  getMasterListAnalytics,
  getMasterListSummary,
} from "@/services/analytics/analytics-service";
import type { MasterListAnalyticsResponse } from "@dashboard/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { lazy, Suspense, useMemo, useState } from "react";
import { toast } from "sonner";

import { AiSummaryCard } from "./ai-summary-card";
import {
  AnalyticsDateFilter,
  type AnalyticsDateRange,
} from "./charts/analytics-date-filter";
import { CategoryPie } from "./charts/category-pie";
import { ChartCard } from "./charts/chart-card";
import { ConversionGauge } from "./charts/conversion-gauge";
import { KpiStatTile } from "./charts/kpi-stat-tile";
import { RankedBar } from "./charts/ranked-bar";
import { StatusBreakdownCard } from "./charts/status-breakdown-card";
import { TrendLine } from "./charts/trend-line";
import { TrendPill } from "./charts/trend-pill";
import { DormantFacilitiesTable } from "./dormant-facilities-table";

// MapLibre is the heaviest dependency on the page, so it loads on demand.
const CountyHeatMap = lazy(() => import("./county-heat-map"));

export default function MasterListAnalyticsPage() {
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>({
    start: null,
    end: null,
  });

  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const entitlement = useEntitlement(activeOrganizationId);
  const canUseAi = entitlement.has("ai");
  const canUseAdvancedAnalytics = entitlement.has("advanced_analytics");

  const queryClient = useQueryClient();

  const start = dateRange.start ? dateRange.start.toISOString() : null;
  const end = dateRange.end ? dateRange.end.toISOString() : null;

  const { data: analytics } = useQuery({
    queryKey: ["master-list-analytics", start, end],
    queryFn: () => getMasterListAnalytics(start, end),
    enabled: canUseAdvancedAnalytics,
    staleTime: 1000 * 60 * 5,
  });

  const summaryQueryKey = ["master-list-analytics-summary", start, end];

  const {
    data: summary,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: summaryError,
  } = useQuery({
    queryKey: summaryQueryKey,
    enabled: !!analytics && canUseAi,
    queryFn: () =>
      getMasterListSummary(
        analytics ?? ({} as MasterListAnalyticsResponse),
        start,
        end
      ),
    staleTime: 1000 * 60 * 5,
  });

  const regenerateSummaryMutation = useMutation({
    mutationFn: () =>
      getMasterListSummary(
        analytics ?? ({} as MasterListAnalyticsResponse),
        start,
        end,
        true
      ),
    onSuccess: (fresh) => {
      queryClient.setQueryData(summaryQueryKey, fresh);
      toast.success("Insights refreshed");
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, "Failed to refresh insights")),
  });

  // Memoised for referential stability, not for the cost of the transform:
  // recharts replays a series' whole animation when its data identity changes,
  // so a fresh array on every render re-swept every chart on the page.
  const charts = useMemo(
    () => buildMasterListChartData(analytics),
    [analytics]
  );

  if (!canUseAdvancedAnalytics) {
    return (
      <FeatureLocked
        title="Analytics is a Growth feature"
        description="Master marketing list analytics, facility coverage and AI insights are available on Growth and Scale."
        team={activeOrganizationId}
      />
    );
  }

  const totals = analytics?.totals;
  const hasPeriodFilter = Boolean(dateRange.start && dateRange.end);
  const referring = (totals?.referringFacilities ?? 0).toLocaleString();
  const inScope = (totals?.facilitiesThisPeriod ?? 0).toLocaleString();

  const insightSections = [
    { title: "Key Insights", items: summary?.key_insights },
    { title: "Bottlenecks", items: summary?.bottlenecks },
    { title: "Opportunities", items: summary?.opportunities },
    {
      title: "Short-Term Strategy",
      items: summary?.recommended_strategy?.short_term,
    },
    {
      title: "Long-Term Strategy",
      items: summary?.recommended_strategy?.long_term,
    },
    { title: "Final Recommendations", text: summary?.final_recommendations },
  ];

  return (
    <div className="page-style">
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <PageHeader
            title="Master Marketing List Analytics"
            description="Facility coverage, pipeline and referral productivity across your marketing list."
          />

          <AnalyticsDateFilter onChange={setDateRange} />
        </div>

        {/* AI SUMMARY CARD — the endpoint is gated on the ai feature */}
        {canUseAi && (
          <AiSummaryCard
            isLoading={isLoadingSummary || regenerateSummaryMutation.isPending}
            preview={summary?.executive_summary}
            sections={insightSections}
            fallbackPreview="Facility insights will appear here once the list has enough activity."
            error={
              isErrorSummary
                ? getApiErrorMessage(summaryError, "Failed to load insights")
                : null
            }
            onRegenerate={() => regenerateSummaryMutation.mutate()}
          />
        )}

        {/* KPI TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiStatTile
            label="Total Facilities"
            value={(totals?.totalFacilities ?? 0).toLocaleString()}
            seriesLabel="Facilities"
          />
          <KpiStatTile
            label={hasPeriodFilter ? "Added This Period" : "Facilities Added"}
            value={inScope}
            seriesLabel="Facilities"
            delta={charts.growthDelta}
            series={charts.growthTrend}
          />
          <KpiStatTile
            label="Referring Facilities"
            value={referring}
            seriesLabel="Facilities"
          />
          <KpiStatTile
            label="Not Yet Referring"
            value={(totals?.dormantFacilities ?? 0).toLocaleString()}
            seriesLabel="Facilities"
            positiveDirection="down"
          />
        </div>

        {/* COVERAGE + PIPELINE + TYPE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ChartCard title="Referral Coverage">
            <ConversionGauge
              rate={totals?.coverageRate ?? 0}
              caption={referring + " of " + inScope + " facilities"}
            />
          </ChartCard>

          <StatusBreakdownCard
            slices={charts.statusSlices}
            title="Facility Pipeline"
            totalLabel="Total facilities"
            activeSuffix="Facilities"
          />

          <ChartCard title="Type of Facility">
            <CategoryPie
              data={charts.facilityTypes}
              variant="pie"
              emptyMessage="No facility type data available"
            />
          </ChartCard>
        </div>

        {/* GROWTH + DORMANT */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ChartCard
            title="Facilities Added per Month"
            className="md:col-span-2"
            action={
              charts.growthDelta ? (
                <TrendPill delta={charts.growthDelta} />
              ) : undefined
            }
          >
            <TrendLine
              data={charts.growthTrend}
              emptyMessage="No facilities added in this period"
            />
          </ChartCard>

          <ChartCard title="Facilities Not Yet Referring">
            <DormantFacilitiesTable facilities={analytics?.dormant ?? []} />
          </ChartCard>
        </div>

        {/* SOURCES + COUNTIES + OWNERSHIP */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <ChartCard title="Top 10 Referring Facilities">
            <RankedBar
              data={charts.topReferringFacilities}
              layout="horizontal"
              emptyMessage="No referral data available"
            />
          </ChartCard>

          <ChartCard title="Top 10 Counties Covered">
            <RankedBar
              data={charts.counties}
              layout="horizontal"
              metricLabel="Facilities"
              emptyMessage="No county data available"
            />
          </ChartCard>

          <ChartCard title="Facilities per Liaison">
            <RankedBar
              data={charts.byLiaison}
              layout="horizontal"
              metricLabel="Facilities"
              emptyMessage="No assigned facilities"
            />
          </ChartCard>
        </div>

        {/* COUNTY HEAT MAP */}
        <ChartCard title="Facility Density by County">
          <Suspense
            fallback={
              <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground sm:h-[450px]">
                Loading map...
              </div>
            }
          >
            <CountyHeatMap
              counties={
                analytics?.counties?.map((county) => ({
                  value: county.value ?? "",
                  _count: { value: county._count.value },
                })) ?? []
              }
            />
          </Suspense>
        </ChartCard>
      </div>
    </div>
  );
}
