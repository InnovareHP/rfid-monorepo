import { FeatureLocked } from "@/components/feature-locked";
import { useEntitlement } from "@/hooks/use-entitlement";
import { useRouteContext } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { exportElementToPdf } from "@/lib/helper/pdf-export";
import { getMarketingList } from "@/services/analytics/analytics-service";
import { getLiaisons } from "@/services/options/options-service";
import type { LiaisonAnalyticsCardData } from "@dashboard/shared";
import { mapAIAnalysisToInsights } from "@dashboard/shared";
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

const EMPTY_FILTERS: Filters = { start: null, end: null, userId: null };
const PDF_ELEMENT_ID = "marketing-analytics-pdf";

const MarketingListPage = () => {
  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const canUseAdvancedAnalytics = useEntitlement(activeOrganizationId).has(
    "advanced_analytics"
  );

  const [pendingFilters, setPendingFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
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
      const timestamp = new Date().toISOString().split("T")[0];
      await exportElementToPdf(
        PDF_ELEMENT_ID,
        `marketing-analytics-${timestamp}.pdf`
      );
      toast.success("PDF exported successfully!");
    } catch {
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setPendingFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    toast.info("Filters reset");
  };

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
    toast.success("Filters applied");
  };

  const hasActiveFilters = Boolean(
    filters.start || filters.end || filters.userId
  );

  if (!canUseAdvancedAnalytics) {
    return (
      <FeatureLocked
        title="Analytics is a Growth feature"
        description="Marketing list analytics and liaison reporting are available on Growth and Scale."
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
        title="Master List Analytics Dashboard"
        description="Track performance, insights, and engagement metrics."
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KpiStatTile
            label="Total Facilities"
            value={totalFacilities.toLocaleString()}
          />
          <KpiStatTile
            label="Active Partners"
            value={activePartners.toLocaleString()}
          />
          <KpiStatTile
            label="Total Interactions"
            value={totalInteractions.toLocaleString()}
          />
        </div>

        <MarketingFilters
          liaisons={liaisons}
          selectedLiaison={pendingFilters.userId}
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
          <div id={PDF_ELEMENT_ID} className="space-y-6">
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

export default MarketingListPage;
