import {
  AnalyticsDateFilter,
  type AnalyticsDateRange,
} from "@/components/analytics/charts/analytics-date-filter";
import { PageHeader } from "@/components/page-header";
import { can } from "@/lib/permissions";
import {
  deleteCustomAnalytic,
  getCustomAnalytics,
  runCustomAnalytic,
  type CustomAnalytic,
} from "@/services/custom-analytics/custom-analytics-service";
import { Button } from "@dashboard/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import type { Member } from "better-auth/plugins/organization";
import { endOfDay } from "date-fns";
import { ChartSpline, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CustomAnalyticsBuilderDialog } from "./custom-analytics-builder-dialog";
import { CustomAnalyticsPreview } from "./custom-analytics-preview";

const ANALYTICS_KEY = ["custom-analytics"];

export default function CustomAnalyticsPage() {
  const queryClient = useQueryClient();
  const [builderOpen, setBuilderOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<AnalyticsDateRange>({
    start: null,
    end: null,
  });

  // The org id rides in the route context, so this avoids a per-mount auth
  // fetch and the undefined first render that would flicker role-gated UI.
  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string;
  };
  const memberData = queryClient.getQueryData<Member>([
    "member-data",
    activeOrganizationId,
  ]);
  const canManage = can(memberData?.role, { analytics: ["manage"] });

  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ANALYTICS_KEY,
    queryFn: getCustomAnalytics,
  });

  // The picker hands back local midnight for the end day, which would cut the
  // last day off server-side where the bound is applied as lte.
  const dateWindow =
    dateRange.start && dateRange.end
      ? { start: dateRange.start, end: endOfDay(dateRange.end) }
      : null;

  const { data: result, isFetching } = useQuery({
    queryKey: [
      "custom-analytic-run",
      activeId,
      dateWindow?.start.toISOString() ?? null,
      dateWindow?.end.toISOString() ?? null,
    ],
    queryFn: () => runCustomAnalytic(activeId!, dateWindow),
    enabled: Boolean(activeId),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomAnalytic,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ANALYTICS_KEY });
      const previous = queryClient.getQueryData<CustomAnalytic[]>(ANALYTICS_KEY);

      queryClient.setQueryData<CustomAnalytic[]>(ANALYTICS_KEY, (current = []) =>
        current.filter((analytic) => analytic.id !== id)
      );

      // The run view belongs to the chart being removed, so it closes with it
      // and comes back if the delete fails.
      const previousActiveId = activeId;
      if (activeId === id) setActiveId(null);

      return { previous, previousActiveId };
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(ANALYTICS_KEY, context?.previous);
      setActiveId(context?.previousActiveId ?? null);
      toast.error("Failed to delete chart");
    },
    onSuccess: () => toast.success("Chart deleted"),
    onSettled: (_data, _error, id) => {
      queryClient.invalidateQueries({ queryKey: ANALYTICS_KEY });
      queryClient.invalidateQueries({ queryKey: ["custom-analytic-run", id] });
      // A deleted chart is SetNull'd off every dashboard, so their cached
      // membership and rendered charts are both stale.
      queryClient.invalidateQueries({
        queryKey: ["custom-analytic-dashboards"],
      });
      // Prefix with no id: a deleted chart is SetNull'd off EVERY dashboard.
      queryClient.invalidateQueries({
        queryKey: ["custom-analytic-dashboard-preview"],
      });
      queryClient.invalidateQueries({
        queryKey: ["custom-analytic-dashboard-run"],
      });
    },
  });

  const active = analytics.find((analytic) => analytic.id === activeId);

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Custom Analytics"
          description="Build a chart on any module's fields and come back to it."
        />

        {canManage && (
          <Button onClick={() => setBuilderOpen(true)}>
            <Plus className="h-4 w-4" />
            New Chart
          </Button>
        )}
      </div>

      <AnalyticsDateFilter onChange={setDateRange} />

      <div className="flex flex-wrap gap-2">
        {analytics.map((analytic) => (
          <div
            key={analytic.id}
            className={
              analytic.id === activeId
                ? "flex items-center gap-2 rounded-lg border border-brand bg-muted px-3 py-2"
                : "flex items-center gap-2 rounded-lg border border-border px-3 py-2"
            }
          >
            <button
              type="button"
              className="flex items-center gap-2 text-sm"
              onClick={() => setActiveId(analytic.id)}
            >
              <ChartSpline className="h-4 w-4" />
              {analytic.name}
              <span className="text-muted-foreground">
                {analytic.module.label}
              </span>
            </button>

            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(analytic.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {!isLoading && analytics.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No saved charts yet. Create one to get started.
          </p>
        )}
      </div>

      {activeId && active && (
        <div className="rounded-xl border border-border bg-card p-4">
          {isFetching || !result ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Loading chart...
            </p>
          ) : (
            <CustomAnalyticsPreview
              result={result}
              name={active.name}
              metricLabel={active.name}
            />
          )}
        </div>
      )}

      <CustomAnalyticsBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
      />
    </div>
  );
}
