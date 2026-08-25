import { CustomAnalyticsPreview } from "@/components/custom-analytics/custom-analytics-preview";
import type { CustomAnalyticDashboardRun } from "@/services/custom-analytics/custom-analytic-dashboard-service";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

type CustomAnalyticDashboardChartTileProps = {
  chart: CustomAnalyticDashboardRun["charts"][number];
  draggable: boolean;
};

export function CustomAnalyticDashboardChartTile({
  chart,
  draggable,
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
      className="gap-3 py-4"
    >
      <CardHeader className="px-4">
        <CardTitle className="text-sm">{chart.name}</CardTitle>

        {draggable && (
          <CardAction>
            {/* Listeners bind only to the grip so a TABLE tile's pagination
                controls and recharts tooltips keep working. */}
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
