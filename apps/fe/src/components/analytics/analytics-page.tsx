import { lazy, Suspense, useState } from "react";

import {
  getAnalytics,
  getAnalyticsSummary,
} from "@/services/analytics/analytics-service";
import type { AnalyticsResponse } from "@dashboard/shared";

import {
  buildAnalyticsChartData,
  formatDays,
} from "@/lib/helper/analytics-chart-data";
import { useQuery } from "@tanstack/react-query";
import AiSumary from "./ai-sumary";
import {
  AnalyticsDateFilter,
  type AnalyticsDateRange,
} from "./charts/analytics-date-filter";
import { CategoryPie } from "./charts/category-pie";
import { ChartCard } from "./charts/chart-card";
import { ConversionGauge } from "./charts/conversion-gauge";
import { EmergingSourcesCard } from "./charts/emerging-sources-card";
import { KpiStatTile } from "./charts/kpi-stat-tile";
import { RankedBar } from "./charts/ranked-bar";
import { ScorecardCard } from "./charts/scorecard-card";
import { StatusBreakdownCard } from "./charts/status-breakdown-card";
import { TrendLine } from "./charts/trend-line";
import { TrendPill } from "./charts/trend-pill";
import { DenialReasonsTable } from "./denial-reasons-table";

// Mapbox is the heaviest dependency on the page, so it loads on demand.
const CountyHeatMap = lazy(() => import("./county-heat-map"));

export default function ReferralAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>({
    start: null,
    end: null,
  });

  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["analytics", dateRange],
    queryFn: async () => {
      const start = dateRange.start ? dateRange.start.toISOString() : null;
      const end = dateRange.end ? dateRange.end.toISOString() : null;
      return (await getAnalytics(start, end)) as AnalyticsResponse;
    },
  });

  const { data: analyticsSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["analyticsSummary", analytics?.analytics],
    enabled: !!analytics,
    queryFn: async () => {
      return await getAnalyticsSummary(analytics ?? ({} as AnalyticsResponse));
    },
  });

  const charts = buildAnalyticsChartData(analytics);
  const hasPeriodFilter = Boolean(dateRange.start && dateRange.end);

  const totalReferrals = analytics?.totalCounts?.totalReferrals ?? 0;
  const referralsThisPeriod = analytics?.totalCounts?.referralsThisPeriod ?? 0;
  const admitted = analytics?.conversion?.admitted ?? 0;
  const conversionRate = analytics?.conversion?.conversionRate ?? 0;

  return (
    <div className="min-h-full bg-white p-8">
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="page-title text-4xl font-bold tracking-tight">
              Referral Analytics Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track key outreach and referral performance metrics.
            </p>
          </div>

          <AnalyticsDateFilter
            onChange={(range) => {
              setDateRange(range);
              refetchAnalytics();
            }}
          />
        </div>

        {/* KPI TILES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiStatTile
            label="Total Referrals"
            value={(hasPeriodFilter
              ? referralsThisPeriod
              : totalReferrals
            ).toLocaleString()}
            delta={charts.referralTrendDelta}
            series={charts.referralTrend}
          />
          <KpiStatTile
            label="Converted"
            value={admitted.toLocaleString()}
            seriesLabel="Admitted"
            delta={charts.convertedDelta}
            series={charts.convertedTrend}
          />
          <KpiStatTile
            label="Avg. Time by Status"
            value={formatDays(charts.avgDays)}
            seriesLabel="Avg days"
            delta={charts.avgTimeDelta}
            series={charts.avgTimeTrend}
          />
        </div>

        {/* MIX + CONVERSION + STATUS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ChartCard title="Payer Source Mix">
            <CategoryPie
              data={charts.payers}
              variant="pie"
              emptyMessage="No payer data available"
            />
          </ChartCard>

          <ChartCard title="Conversion-to-Admission Rate">
            <ConversionGauge
              rate={conversionRate}
              caption={`${admitted.toLocaleString()} admitted`}
              delta={charts.conversionRateDelta}
            />
          </ChartCard>

          <StatusBreakdownCard slices={charts.statusSlices} />
        </div>

        {/* TRENDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChartCard
            title="Monthly Referral Trend"
            action={
              charts.referralTrendDelta ? (
                <TrendPill delta={charts.referralTrendDelta} />
              ) : undefined
            }
          >
            <TrendLine data={charts.referralTrend} />
          </ChartCard>

          <ChartCard
            title="Monthly Denial Trend"
            action={
              charts.denialTrendDelta ? (
                <TrendPill
                  delta={charts.denialTrendDelta}
                  positiveDirection="down"
                />
              ) : undefined
            }
          >
            <TrendLine
              data={charts.denialTrend}
              emptyMessage="No denial trend data available"
            />
          </ChartCard>
        </div>

        {/* COUNTIES + DENIAL REASONS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ChartCard
            title="Top 10 Counties Generating Referrals"
            className="md:col-span-2"
          >
            <RankedBar
              data={charts.counties}
              emptyMessage="No county data available"
            />
          </ChartCard>

          <ChartCard title="Top 5 Denial Reasons">
            <DenialReasonsTable reasons={charts.denialReasons} />
          </ChartCard>
        </div>

        {/* SOURCES + TYPES */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <ChartCard title="Top 10 Referring Facilities">
            <RankedBar
              data={charts.facilities}
              layout="horizontal"
              emptyMessage="No facility data available"
            />
          </ChartCard>

          <ChartCard title="Top 10 Referring Clinicians">
            <RankedBar
              data={charts.clinicians}
              layout="horizontal"
              emptyMessage="No clinician data available"
            />
          </ChartCard>

          <ChartCard title="Referral Source Type Breakdown">
            <CategoryPie
              data={charts.sources}
              emptyMessage="No source data available"
            />
          </ChartCard>

          <ChartCard title="Admission Type">
            <CategoryPie
              data={charts.admissionTypes}
              emptyMessage="No admission type data available"
            />
          </ChartCard>

          <EmergingSourcesCard sources={charts.emergingSources} />

          <ScorecardCard sources={charts.scorecard} />
        </div>

        {/* COUNTY HEAT MAP */}
        <ChartCard title="Referral Density by County">
          <Suspense
            fallback={
              <div className="flex h-[450px] items-center justify-center text-sm text-muted-foreground">
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

        {/* AI SUMMARY */}
        <AiSumary
          isLoadingSummary={isLoadingSummary}
          summary={analyticsSummary}
        />
      </div>
    </div>
  );
}
