import { useAnalyticChartActions } from "@/hooks/use-analytic-chart-actions";
import { getCustomAnalytics } from "@/services/custom-analytics/custom-analytics-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { CustomAnalyticEditSheet } from "./custom-analytic-edit-sheet";

// Charts on no dashboard. They are only reachable here, so the section exists
// to let them be filed or deleted rather than to be browsed - it hides itself
// entirely when there are none.
export function UnfiledChartsSection({ canManage }: { canManage: boolean }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const { remove } = useAnalyticChartActions();

  const { data: charts = [] } = useQuery({
    queryKey: ["custom-analytics", "unfiled"],
    queryFn: () => getCustomAnalytics(undefined, true),
  });

  if (charts.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-semibold">Unfiled charts</p>
        <p className="text-xs text-muted-foreground">
          Saved charts that are not on any dashboard. Add them to one from the
          dashboard&apos;s Add Existing button, or delete them.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {charts.map((chart) => (
          <Card key={chart.id}>
            <CardContent className="flex items-center justify-between gap-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium">{chart.name}</p>
                <Badge variant="secondary">{chart.module.label}</Badge>
              </div>

              {canManage && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingId(chart.id)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${chart.name}`}
                    onClick={() => remove.mutate(chart.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <CustomAnalyticEditSheet
        analyticId={editingId}
        open={editingId !== null}
        onOpenChange={(open) => !open && setEditingId(null)}
        onSaved={() => setEditingId(null)}
      />
    </div>
  );
}
