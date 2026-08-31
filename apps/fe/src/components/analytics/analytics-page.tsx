import { FeatureLocked } from "@/components/feature-locked";
import { PageHeader } from "@/components/page-header";
import { useEntitlement } from "@/hooks/use-entitlement";
import { useRouteContext } from "@tanstack/react-router";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/helper/helper";
import { toast } from "sonner";
import { AiSummaryCard } from "./ai-summary-card";
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

// MapLibre is the heaviest dependency on the page, so it loads on demand.
const CountyHeatMap = lazy(() => import("./county-heat-map"));

export default function ReferralAnalyticsDashboard() {
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

  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["analytics", dateRange],
    queryFn: async () => {
      const start = dateRange.start ? dateRange.start.toISOString() : null;
      const end = dateRange.end ? dateRange.end.toISOString() : null;
      return (await getAnalytics(start, end)) as AnalyticsResponse;
    },
    enabled: canUseAdvancedAnalytics,
  });

  const summaryQueryKey = [
    "analyticsSummary",
    dateRange.start?.toISOString() ?? null,
    dateRange.end?.toISOString() ?? null,
  ];

  const {
    data: analyticsSummary,
    isLoading: isLoadingSummary,
    isError: isErrorSummary,
    error: summaryError,
  } = useQuery({
    queryKey: summaryQueryKey,
    enabled: !!analytics && canUseAi,
    queryFn: async () => {
      const start = dateRange.start ? dateRange.start.toISOString() : null;
      const end = dateRange.end ? dateRange.end.toISOString() : null;
      return await getAnalyticsSummary(
        analytics ?? ({} as AnalyticsResponse),
        start,
        end
      );
    },
    staleTime: 1000 * 60 * 5,
  });

  const regenerateSummaryMutation = useMutation({
    mutationFn: async () => {
      const start = dateRange.start ? dateRange.start.toISOString() : null;
      const end = dateRange.end ? dateRange.end.toISOString() : null;
      return await getAnalyticsSummary(
        analytics ?? ({} as AnalyticsResponse),
        start,
        end,
        true
      );
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(summaryQueryKey, fresh);
      toast.success("Insights refreshed");
    },
    onError: (err) =>
      toast.error(getApiErrorMessage(err, "Failed to refresh insights")),
  });

  if (!canUseAdvancedAnalytics) {
    return (
      <FeatureLocked
        title="Analytics is a Growth feature"
        description="Referral and marketing analytics, conversion tracking and AI insights are available on Growth and Scale."
        team={activeOrganizationId}
      />
    );
  }

  const hasPeriodFilter = dateRange.start && dateRange.end;
  const charts = buildAnalyticsChartData(analytics);
  const totalReferrals = analytics?.totalCounts?.totalReferrals ?? 0;
  const referralsThisPeriod = analytics?.totalCounts?.referralsThisPeriod ?? 0;
  const admitted = analytics?.conversion?.admitted ?? 0;
  const conversionRate = analytics?.conversion?.conversionRate ?? 0;

  const insightSections = [
    { title: "Key Insights", items: analyticsSummary?.key_insights },
    { title: "Bottlenecks", items: analyticsSummary?.bottlenecks },
    { title: "Opportunities", items: analyticsSummary?.opportunities },
    {
      title: "Short-Term Strategy",
      items: analyticsSummary?.recommended_strategy?.short_term,
    },
    {
      title: "Long-Term Strategy",
      items: analyticsSummary?.recommended_strategy?.long_term,
    },
    {
      title: "Final Recommendations",
      text: analyticsSummary?.final_recommendations,
    },
  ];

  return (
    <div className="page-style">
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <PageHeader
            title="Referral Intelligence Dashboard"
            description="Track key outreach and referral performance metrics."
          />

          <AnalyticsDateFilter
            onChange={(range) => {
              setDateRange(range);
              refetchAnalytics();
            }}
          />
        </div>

        {/* AI SUMMARY CARD — the endpoint is gated on the ai feature */}
        {canUseAi && (
        <AiSummaryCard
          isLoading={isLoadingSummary || regenerateSummaryMutation.isPending}
          preview={analyticsSummary?.executive_summary}
          sections={insightSections}
          fallbackPreview="Referral insights will appear here once enough activity is recorded."
          error={
            isErrorSummary
              ? getApiErrorMessage(summaryError, "Failed to load insights")
              : null
          }
          onRegenerate={() => regenerateSummaryMutation.mutate()}
        />
        )}

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
