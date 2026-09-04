import {
  AnalyticsDateFilter,
  type AnalyticsDateRange,
} from "@/components/analytics/charts/analytics-date-filter";
import { ExportPdfButton } from "@/components/analytics/export-pdf-button";
import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/permissions";
import {
  getDashboard,
  reorderDashboardCharts,
  downloadDashboardPdf,
  runDashboard,
  updateDashboard,
  type CustomAnalyticDashboardDetail,
  type CustomAnalyticDashboardRun,
} from "@/services/custom-analytics/custom-analytic-dashboard-service";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouteContext } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { endOfDay } from "date-fns";
import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CustomAnalyticDashboardAddChartsDialog } from "./custom-analytic-dashboard-add-charts-dialog";
import { CustomAnalyticDashboardCardSkeleton } from "./custom-analytic-dashboard-card-skeleton";
import { CustomAnalyticDashboardChartGrid } from "./custom-analytic-dashboard-chart-grid";
import { ModuleAnalyticsInsights } from "../module/module-analytics-insights";
import { useAnalyticChartActions } from "@/hooks/use-analytic-chart-actions";
import { CustomAnalyticEditSheet } from "./custom-analytic-edit-sheet";
import { CustomAnalyticDashboardFormDialog } from "./custom-analytic-dashboard-form-dialog";

// The id comes from the route for a hand-built dashboard, and from the caller
// for a module's seeded page, which resolves it by module key first.
type Props = {
  dashboardId?: string;
  description?: string;
  // A module's seeded page is a report, not a canvas: editing it happens in the
  // dashboards area, where every dashboard is managed the same way.
  editable?: boolean;
  // A module's own page shows the AI panel; a hand-built dashboard does not.
  insightsLabel?: string;
};

export default function CustomAnalyticDashboardViewPage({
  dashboardId: dashboardIdProp,
  description,
  editable = true,
  insightsLabel,
}: Props = {}) {
  const queryClient = useQueryClient();
  const params = useParams({ strict: false }) as {
    dashboardId?: string;
    team?: string;
  };
  const dashboardId = dashboardIdProp ?? params.dashboardId ?? "";
  const [formOpen, setFormOpen] = useState(false);
  // One state, not an id plus an open flag: null is closed, and an entry
  // whose analyticId is null is a new chart rather than an edit.
  const [editing, setEditing] = useState<{ analyticId: string | null } | null>(
    null
  );
  const chartActions = useAnalyticChartActions();
  const [addChartsOpen, setAddChartsOpen] = useState(false);
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
  const canManage = editable && can(memberData?.role, { analytics: ["manage"] });

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

  // A module's seeded page keeps its name and its charts; only each chart's own
  // definition is editable.
  const isFixed = dashboard?.isDefault === true;

  // Membership lives on the page rather than in the edit dialog, so adding and
  // removing a chart is done where the charts are.
  const memberIds = (dashboard?.analytics ?? []).map((analytic) => analytic.id);

  const membershipMutation = useMutation({
    mutationFn: (analyticIds: string[]) =>
      updateDashboard(dashboardId, { analyticIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DETAIL_KEY });
      queryClient.invalidateQueries({ queryKey: RUN_PREFIX });
      queryClient.invalidateQueries({ queryKey: PREVIEW_KEY });
      queryClient.invalidateQueries({ queryKey: DASHBOARDS_KEY });
      setAddChartsOpen(false);
    },
    onError: () => toast.error("Failed to update the dashboard charts"),
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
          description={
            description ?? "A group of saved charts, filtered together."
          }
        />

        {canManage && dashboard && (
          <div className="flex items-center gap-2">
            {!isFixed && (
              <>
                <Button variant="outline" onClick={() => setFormOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  Rename
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAddChartsOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Existing
                </Button>
              </>
            )}

            {/* Allowed on a seeded page too: building a chart here attaches it
                to this dashboard, where the old create route left it orphaned. */}
            <Button onClick={() => setEditing({ analyticId: null })}>
              <Plus className="h-4 w-4" />
              New Chart
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <AnalyticsDateFilter onChange={setDateRange} />

        <ExportPdfButton
          disabled={!result}
          onExport={() => downloadDashboardPdf(dashboardId, dateWindow)}
        />
      </div>

      {insightsLabel && (
        <ModuleAnalyticsInsights
          dashboardId={dashboardId}
          dateWindow={dateWindow}
          label={insightsLabel}
        />
      )}

      {isPending || !result ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <CustomAnalyticDashboardCardSkeleton />
          <CustomAnalyticDashboardCardSkeleton />
        </div>
      ) : result.charts.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          This dashboard has no charts yet. Use Add Chart to put some on it.
        </p>
      ) : (
        <CustomAnalyticDashboardChartGrid
          charts={result.charts}
          canManage={canManage}
          onReorder={(ids) => reorderMutation.mutate(ids)}
          onRemove={
            isFixed
              ? undefined
              : (id) =>
                  membershipMutation.mutate(
                    memberIds.filter((memberId) => memberId !== id)
                  )
          }
          onEdit={(id) => setEditing({ analyticId: id })}
          onDuplicate={(id) => chartActions.duplicate.mutate(id)}
          onWidthChange={(id, tileSpan) =>
            chartActions.setWidth.mutate({ id, tileSpan })
          }
          onDelete={(id) => chartActions.remove.mutate(id)}
        />
      )}

      <CustomAnalyticEditSheet
        analyticId={editing?.analyticId ?? null}
        open={editing !== null}
        attachToDashboardId={dashboardId}
        lockedModuleId={dashboard?.moduleId ?? undefined}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => setEditing(null)}
      />

      <CustomAnalyticDashboardFormDialog
        open={formOpen}
        dashboard={dashboard ?? null}
        onOpenChange={setFormOpen}
      />

      <CustomAnalyticDashboardAddChartsDialog
        open={addChartsOpen}
        memberIds={memberIds}
        isSaving={membershipMutation.isPending}
        onOpenChange={setAddChartsOpen}
        onAdd={(analyticIds) =>
          membershipMutation.mutate([...memberIds, ...analyticIds])
        }
      />
    </div>
  );
}
