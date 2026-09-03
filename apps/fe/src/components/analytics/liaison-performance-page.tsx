import { FeatureLocked } from "@/components/feature-locked";
import { useEntitlement } from "@/hooks/use-entitlement";
import { useRouteContext } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import {
  downloadLiaisonPerformancePdf,
  getMarketingList,
} from "@/services/analytics/analytics-service";
import { getLiaisons } from "@/services/options/options-service";
import type { LiaisonAnalyticsCardData } from "@dashboard/shared";
import { isOrgAdmin, mapAIAnalysisToInsights } from "@dashboard/shared";
import type { User } from "better-auth";
import type { Member } from "better-auth/plugins/organization";
import { DateRangeFilter } from "@dashboard/ui/components/date-range-filter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AiSummaryCard } from "./ai-summary-card";
import { LiaisonAnalyticsCard } from "./analytics-card";
import {
  AnalyticsEmpty,
  AnalyticsError,
  AnalyticsLoading,
} from "./analytics-states";
import { KpiStatTile } from "./charts/kpi-stat-tile";
import { MarketingFilters } from "./marketing-filters";

type Filters = {
  start: Date | null;
  end: Date | null;
  userId: string | null;
};

const LiaisonPerformancePage = () => {
  const { activeOrganizationId, user, memberData } = useRouteContext({
    from: "/_team",
  }) as {
    activeOrganizationId: string;
    user: User;
    memberData: Member | null;
  };
  const canUseAdvancedAnalytics =
    useEntitlement(activeOrganizationId).has("advanced_analytics");

  // A liaison reads their own report only, so the filter starts and stays on them.
  const canFilterLiaisons = isOrgAdmin(memberData?.role);
  const defaultFilters: Filters = {
    start: null,
    end: null,
    userId: canFilterLiaisons ? null : user.id,
  };

  const [pendingFilters, setPendingFilters] = useState<Filters>(defaultFilters);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["marketing-lead-analytics", filters],
    queryFn: () => getMarketingList(filters.start, filters.end, filters.userId),
    staleTime: 1000 * 60 * 5,
  });

  const { data: liaisons = [] } = useQuery({
    queryKey: ["liaisons"],
    queryFn: () => getLiaisons(true),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
  });

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // The same filters the page is showing, so the document and the screen
      // cannot disagree.
      await downloadLiaisonPerformancePdf(
        filters.start,
        filters.end,
        filters.userId
      );
      toast.success("Report downloaded");
    } catch {
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setPendingFilters(defaultFilters);
    setFilters(defaultFilters);
    toast.info("Filters reset");
  };

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
    toast.success("Filters applied");
  };

  const hasActiveFilters = Boolean(
    filters.start || filters.end || (canFilterLiaisons && filters.userId)
  );

  if (!canUseAdvancedAnalytics) {
    return (
      <FeatureLocked
        title="Analytics is a Growth feature"
        description="Liaison performance reporting is available on Growth and Scale."
        team={activeOrganizationId}
      />
    );
  }

  const rows: LiaisonAnalyticsCardData[] = data?.analytics ?? [];
  const totalFacilities = new Set(rows.flatMap((row) => row.facilitiesCovered))
    .size;
  const activePartners = new Set(rows.flatMap((row) => row.peopleContacted))
    .size;
  const totalInteractions = rows.reduce(
    (sum, row) => sum + row.totalInteractions,
    0
  );
  const totalReferrals = data?.totals?.referrals ?? 0;
  const totalAdmissions = data?.totals?.admissions ?? 0;

  const insightSections = data?.analysis
    ? mapAIAnalysisToInsights(data.analysis).map((insight) => ({
        title: insight.title,
        items: insight.items,
      }))
    : [];

  return (
    <div className="min-h-full bg-white p-4 sm:p-8">
      <div className="space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <PageHeader
            title="Liaison Performance"
            description="Track liaison outreach, engagement, and referral conversion."
          />

          <DateRangeFilter
            from={pendingFilters.start}
            to={pendingFilters.end}
            onChange={(range: { from: Date | null; to: Date | null }) =>
              setPendingFilters((prev) => ({
                ...prev,
                start: range.from,
                end: range.to,
              }))
            }
          />
        </div>

        {/* KPI TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
          <KpiStatTile
            label="Total Referrals"
            value={totalReferrals.toLocaleString()}
          />
          <KpiStatTile
            label="Admissions"
            value={totalAdmissions.toLocaleString()}
          />
          <KpiStatTile
            label="Facilities Visited"
            value={totalFacilities.toLocaleString()}
          />
          <KpiStatTile
            label="People Contacted"
            value={activePartners.toLocaleString()}
          />
          <KpiStatTile
            label="Total Interactions"
            value={totalInteractions.toLocaleString()}
          />
        </div>

        <MarketingFilters
          liaisons={
            canFilterLiaisons
              ? liaisons
              : liaisons.filter((liaison) => liaison.id === user.id)
          }
          selectedLiaison={pendingFilters.userId}
          canSelectLiaison={canFilterLiaisons}
          onSelectLiaison={(userId) =>
            setPendingFilters((prev) => ({ ...prev, userId }))
          }
          onApply={handleApplyFilters}
          onReset={handleReset}
          onExport={handleExportPDF}
          canReset={hasActiveFilters}
          canExport={Boolean(filters.start && filters.end && data)}
          isExporting={isExporting}
        />

        {/* CONTENT */}
        {isLoading ? (
          <AnalyticsLoading />
        ) : isError ? (
          <AnalyticsError message={(error as Error).message} />
        ) : rows.length === 0 ? (
          <AnalyticsEmpty />
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-2">
                <h2 className="text-base font-medium text-foreground">
                  Liaison Performance Overview
                </h2>
                <span className="ml-auto rounded-full bg-brand/5 px-3 py-1 text-sm text-muted-foreground">
                  {rows.length} {rows.length === 1 ? "Liaison" : "Liaisons"}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {rows.map((liaison) => (
                  <LiaisonAnalyticsCard key={liaison.memberId} data={liaison} />
                ))}
              </div>
            </div>

            <AiSummaryCard
              isLoading={isLoading}
              preview={insightSections[0]?.items?.[0]}
              sections={insightSections}
              fallbackPreview="Liaison engagement analysis will appear here once enough activity is logged."
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LiaisonPerformancePage;
