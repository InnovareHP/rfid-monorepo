import {
  AnalyticsDateFilter,
  type AnalyticsDateRange,
} from "@/components/analytics/charts/analytics-date-filter";
import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/permissions";
import {
  getDashboard,
  reorderDashboardCharts,
  runDashboard,
  type CustomAnalyticDashboardDetail,
  type CustomAnalyticDashboardRun,
} from "@/services/custom-analytics/custom-analytic-dashboard-service";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouteContext } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { endOfDay } from "date-fns";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CustomAnalyticDashboardCardSkeleton } from "./custom-analytic-dashboard-card-skeleton";
import { CustomAnalyticDashboardChartGrid } from "./custom-analytic-dashboard-chart-grid";
import { CustomAnalyticDashboardFormDialog } from "./custom-analytic-dashboard-form-dialog";

export default function CustomAnalyticDashboardViewPage() {
  const queryClient = useQueryClient();
  const { dashboardId } = useParams({ strict: false }) as {
    dashboardId: string;
  };
  const [formOpen, setFormOpen] = useState(false);
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>({
    start: null,
    end: null,
  });

  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    activeOrganizationId,
  ]);
  const canManage = can(memberData?.role, { analytics: ["manage"] });

  const RUN_PREFIX = ["custom-analytic-dashboard-run", dashboardId];
  const DETAIL_KEY = ["custom-analytic-dashboard", dashboardId];
  const PREVIEW_KEY = ["custom-analytic-dashboard-preview", dashboardId];
  const DASHBOARDS_KEY = ["custom-analytic-dashboards"];

  const { data: dashboard } = useQuery({
    queryKey: DETAIL_KEY,
    queryFn: () => getDashboard(dashboardId),
  });

  const reorderMutation = useMutation({
    mutationFn: (analyticIds: string[]) =>
      reorderDashboardCharts(dashboardId, analyticIds),

    // TanStack Query serializes mutations sharing a scope id, so two fast
    // consecutive drops apply in the order they were made instead of racing.
    scope: { id: `dashboard-reorder-${dashboardId}` },

    onMutate: async (analyticIds) => {
      await queryClient.cancelQueries({ queryKey: RUN_PREFIX });
      await queryClient.cancelQueries({ queryKey: DETAIL_KEY });

      const runSnapshots = queryClient.getQueriesData<CustomAnalyticDashboardRun>(
        { queryKey: RUN_PREFIX }
      );
      const detailSnapshot =
        queryClient.getQueryData<CustomAnalyticDashboardDetail>(DETAIL_KEY);

      const rank = new Map(analyticIds.map((id, index) => [id, index]));
      // Sort by rank rather than rebuilding from analyticIds: an id present in
      // the cache but missing from the payload (deleted server-side mid-drag)
      // sinks to the end instead of vanishing, and onSettled's refetch corrects
      // it. An id in the payload that is not cached is simply ignored.
      const byRank = <T extends { id: string }>(a: T, b: T) =>
        (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
        (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER);

      // The run key is date-parameterized, so several cached windows can exist.
      // Reorder every one of them, not just the active window - otherwise
      // changing the date filter right after a drop shows the pre-drag order
      // from a sibling cache entry until its refetch lands.
      for (const [key, cached] of runSnapshots) {
        if (!cached) continue;
        queryClient.setQueryData<CustomAnalyticDashboardRun>(key, {
          ...cached,
          charts: [...cached.charts].sort(byRank),
        });
      }

      if (detailSnapshot) {
        queryClient.setQueryData<CustomAnalyticDashboardDetail>(DETAIL_KEY, {
          ...detailSnapshot,
          analytics: [...detailSnapshot.analytics].sort(byRank),
        });
      }

      return { runSnapshots, detailSnapshot };
    },

    onError: (_error, _analyticIds, context) => {
      for (const [key, cached] of context?.runSnapshots ?? []) {
        queryClient.setQueryData(key, cached);
      }
      if (context?.detailSnapshot) {
        queryClient.setQueryData(DETAIL_KEY, context.detailSnapshot);
      }
      toast.error("Failed to reorder charts");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: RUN_PREFIX });
      queryClient.invalidateQueries({ queryKey: DETAIL_KEY });
      // The list card's first-chart thumbnail changes when the first chart does.
      queryClient.invalidateQueries({ queryKey: PREVIEW_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARDS_KEY });
    },
  });

  // The picker hands back local midnight for the end day, which would cut the
  // last day off server-side where the bound is applied as lte.
  const dateWindow =
    dateRange.start && dateRange.end
      ? { start: dateRange.start, end: endOfDay(dateRange.end) }
      : null;

  // isPending, not isFetching: a background refetch after a reorder must not
  // unmount the grid and flash the dragged tile back to its old position.
  const { data: result, isPending } = useQuery({
    queryKey: [
      "custom-analytic-dashboard-run",
      dashboardId,
      dateWindow?.start.toISOString() ?? null,
      dateWindow?.end.toISOString() ?? null,
    ],
    queryFn: () => runDashboard(dashboardId, dateWindow),
  });

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={dashboard?.name ?? "Dashboard"}
          description="A group of saved charts, filtered together."
        />

        {canManage && dashboard && (
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit Dashboard
          </Button>
        )}
      </div>

      <AnalyticsDateFilter onChange={setDateRange} />

      {isPending || !result ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <CustomAnalyticDashboardCardSkeleton />
          <CustomAnalyticDashboardCardSkeleton />
        </div>
      ) : result.charts.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          This dashboard has no charts yet. Edit it to add some.
        </p>
      ) : (
        <CustomAnalyticDashboardChartGrid
          charts={result.charts}
          canManage={canManage}
          onReorder={(ids) => reorderMutation.mutate(ids)}
        />
      )}

      <CustomAnalyticDashboardFormDialog
        open={formOpen}
        dashboard={dashboard ?? null}
        onOpenChange={setFormOpen}
      />
    </div>
  );
}
