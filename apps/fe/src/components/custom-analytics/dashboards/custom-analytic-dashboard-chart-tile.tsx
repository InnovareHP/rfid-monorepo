import { CustomAnalyticsPreview } from "@/components/custom-analytics/custom-analytics-preview";
import type { CustomAnalyticDashboardRun } from "@/services/custom-analytics/custom-analytic-dashboard-service";
import type { CustomAnalyticTileSpan } from "@/services/custom-analytics/custom-analytics-service";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { cn } from "@dashboard/ui/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { CustomAnalyticTileMenu } from "./custom-analytic-tile-menu";

type CustomAnalyticDashboardChartTileProps = {
  chart: CustomAnalyticDashboardRun["charts"][number];
  draggable: boolean;
  // Grid width, owned by the caller since only the grid knows its columns.
  className?: string;
  // Absent for a viewer, who cannot change what the dashboard holds.
  onRemove?: () => void;
  // Absent for a viewer; every action on the tile lives behind one menu.
  actions?: {
    onEdit: () => void;
    onDuplicate: () => void;
    onWidthChange: (tileSpan: CustomAnalyticTileSpan) => void;
    onDelete: () => void;
  };
};

export function CustomAnalyticDashboardChartTile({
  chart,
  draggable,
  className,
  onRemove,
  actions,
}: CustomAnalyticDashboardChartTileProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chart.id, disabled: !draggable });

  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className={cn("gap-3 py-4", className)}
    >
      <CardHeader className="px-4">
        <CardTitle className="text-sm">{chart.name}</CardTitle>

        {(draggable || actions) && (
          <CardAction className="flex items-center gap-1">
            {/* Listeners bind only to the grip so a TABLE tile's pagination
                controls and recharts tooltips keep working. */}
            {draggable && (
              <button
                type="button"
                className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
                aria-label={`Drag ${chart.name} to reorder`}
                onClick={(event) => event.stopPropagation()}
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </button>
            )}

            {actions && (
              <CustomAnalyticTileMenu
                name={chart.name}
                tileSpan={chart.tileSpan}
                onEdit={actions.onEdit}
                onDuplicate={actions.onDuplicate}
                onWidthChange={actions.onWidthChange}
                onDelete={actions.onDelete}
                onRemove={onRemove}
              />
            )}
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="px-4">
        <CustomAnalyticsPreview
          result={chart.result}
          name={chart.name}
          metricLabel={chart.name}
        />
      </CardContent>
    </Card>
  );
}
