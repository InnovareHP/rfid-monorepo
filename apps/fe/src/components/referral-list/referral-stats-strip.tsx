import { buildAnalyticsChartData } from "@/lib/helper/analytics-chart-data";
import { getAnalytics } from "@/services/analytics/analytics-service";
import type { AnalyticsResponse } from "@dashboard/shared";
import { useQuery } from "@tanstack/react-query";
import { KpiStatTile } from "../analytics/charts/kpi-stat-tile";

type ReferralStatsStripProps = {
  dateFrom: Date | null;
  dateTo: Date | null;
};

export function ReferralStatsStrip({
  dateFrom,
  dateTo,
}: ReferralStatsStripProps) {
  // ISO strings keep the query key stable across renders
  const start = dateFrom ? dateFrom.toISOString() : null;
  const end = dateTo ? dateTo.toISOString() : null;

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["referral-pipeline-analytics", start, end],
    queryFn: async () => (await getAnalytics(start, end)) as AnalyticsResponse,
  });

  const charts = buildAnalyticsChartData(analytics);
  const hasPeriodFilter = !!start || !!end;
  const totalReferrals = hasPeriodFilter
    ? (analytics?.totalCounts?.referralsThisPeriod ?? 0)
    : (analytics?.totalCounts?.totalReferrals ?? 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <KpiStatTile
        label="Total Referrals"
        value={totalReferrals.toLocaleString()}
        delta={charts.referralTrendDelta}
        isLoading={isLoading}
      />
      <KpiStatTile
        label="Conversion Rate"
        value={`${analytics?.conversion?.conversionRate ?? 0}%`}
        delta={charts.conversionRateDelta}
        isLoading={isLoading}
      />
      <KpiStatTile
        label="Total Denials"
        value={(analytics?.denials?.totalDenials ?? 0).toLocaleString()}
        delta={charts.denialTrendDelta}
        positiveDirection="down"
        isLoading={isLoading}
      />
    </div>
  );
}
