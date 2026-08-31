import type { CustomAnalyticDashboardRun } from "@/services/custom-analytics/custom-analytic-dashboard-service";
import type { CustomAnalyticTileSpan } from "@/services/custom-analytics/custom-analytics-service";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { CustomAnalyticDashboardChartTile } from "./custom-analytic-dashboard-chart-tile";

// Six columns divide into thirds and halves, so a row can hold three KPI tiles
// or a two-thirds chart beside a third.
const SPAN_CLASS: Record<CustomAnalyticTileSpan, string> = {
  THIRD: "md:col-span-3 lg:col-span-2",
  HALF: "md:col-span-3",
  TWO_THIRDS: "md:col-span-6 lg:col-span-4",
  FULL: "md:col-span-6",
};

type CustomAnalyticDashboardChartGridProps = {
  charts: CustomAnalyticDashboardRun["charts"];
  canManage: boolean;
  onReorder: (analyticIds: string[]) => void;
  // Absent when membership is fixed, as it is on a module's seeded page.
  onRemove?: (analyticId: string) => void;
  onEdit: (analyticId: string) => void;
  onDuplicate: (analyticId: string) => void;
  onWidthChange: (analyticId: string, tileSpan: CustomAnalyticTileSpan) => void;
  onDelete: (analyticId: string) => void;
};

export function CustomAnalyticDashboardChartGrid({
  charts,
  canManage,
  onReorder,
  onRemove,
  onEdit,
  onDuplicate,
  onWidthChange,
  onDelete,
}: CustomAnalyticDashboardChartGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // A single chart has nothing to drop onto, so the grip would be a dead
  // affordance.
  const draggable = canManage && charts.length > 1;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = charts.findIndex((chart) => chart.id === active.id);
    const newIndex = charts.findIndex((chart) => chart.id === over.id);
    // First line of defence against a chart deleted mid-drag.
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(charts, oldIndex, newIndex).map((chart) => chart.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={charts.map((chart) => chart.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-6">
          {charts.map((chart) => (
            <CustomAnalyticDashboardChartTile
              key={chart.id}
              chart={chart}
              className={SPAN_CLASS[chart.tileSpan]}
              draggable={draggable}
              onRemove={
                canManage && onRemove ? () => onRemove(chart.id) : undefined
              }
              actions={
                canManage
                  ? {
                      onEdit: () => onEdit(chart.id),
                      onDuplicate: () => onDuplicate(chart.id),
                      onWidthChange: (tileSpan) =>
                        onWidthChange(chart.id, tileSpan),
                      onDelete: () => onDelete(chart.id),
                    }
                  : undefined
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
