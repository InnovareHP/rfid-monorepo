import { CustomAnalyticsPreview } from "@/components/custom-analytics/custom-analytics-preview";
import {
  runDashboard,
  type CustomAnalyticDashboard,
} from "@/services/custom-analytics/custom-analytic-dashboard-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { LayoutTemplate, Trash2 } from "lucide-react";

type CustomAnalyticDashboardCardProps = {
  dashboard: CustomAnalyticDashboard;
  canManage: boolean;
  onOpen: () => void;
  onDelete: () => void;
};

export function CustomAnalyticDashboardCard({
  dashboard,
  canManage,
  onOpen,
  onDelete,
}: CustomAnalyticDashboardCardProps) {
  const hasCharts = dashboard.analytics.length > 0;

  const {
    data: preview,
    isPending,
    isError,
  } = useQuery({
    // Distinct from the view page's run key on purpose: this holds only the
    // first chart, so sharing that key would render a one-chart dashboard.
    queryKey: ["custom-analytic-dashboard-preview", dashboard.id],
    // Only the first chart: one Board scan per card, never per chart.
    queryFn: () => runDashboard(dashboard.id, null, 1),
    enabled: hasCharts,
    // A thumbnail does not need second-fresh data.
    staleTime: 5 * 60_000,
  });

  const emptyState = (
    <div className="flex h-40 flex-col items-center justify-center gap-2">
      <LayoutTemplate className="h-6 w-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No charts yet</p>
    </div>
  );

  const renderPreview = () => {
    if (!hasCharts) return emptyState;
    if (isPending) return <Skeleton className="h-40 w-full" />;
    if (isError) {
      return (
        <div className="flex h-40 items-center justify-center">
          <p className="text-sm text-muted-foreground">Preview unavailable</p>
        </div>
      );
    }
    // A dashboard whose only chart was deleted server-side returns no charts.
    if (preview.charts.length === 0) return emptyState;

    const first = preview.charts[0];

    return (
      <>
        {/* Recharts renders an SVG overlay that would otherwise intercept
            clicks meant for the stretched link, and tooltips make no sense on
            a decorative thumbnail. */}
        <div className="pointer-events-none">
          <CustomAnalyticsPreview
            result={first.result}
            name={first.name}
            metricLabel={first.name}
            variant="thumbnail"
          />
        </div>
        {preview.chartCount > 1 && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            +{preview.chartCount - 1} more
          </p>
        )}
      </>
    );
  };

  return (
    <Card className="relative gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle>
          {/* Stretched-link: the pseudo-element covers the whole card, so the
              decorative preview below is clickable without nesting interactive
              elements or duplicating the accessible name. */}
          <button
            type="button"
            onClick={onOpen}
            className="text-left after:absolute after:inset-0 after:content-['']"
          >
            {dashboard.name}
          </button>
        </CardTitle>
        <CardDescription>
          {dashboard.analytics.length} chart
          {dashboard.analytics.length === 1 ? "" : "s"}
        </CardDescription>

        {canManage && (
          <CardAction>
            <Button
              variant="ghost"
              size="icon"
              className="relative z-10"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="px-4">{renderPreview()}</CardContent>
    </Card>
  );
}
