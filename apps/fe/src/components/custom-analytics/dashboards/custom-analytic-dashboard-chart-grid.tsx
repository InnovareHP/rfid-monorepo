import type { CustomAnalyticDashboardRun } from "@/services/custom-analytics/custom-analytic-dashboard-service";
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

type CustomAnalyticDashboardChartGridProps = {
  charts: CustomAnalyticDashboardRun["charts"];
  canManage: boolean;
  onReorder: (analyticIds: string[]) => void;
};

export function CustomAnalyticDashboardChartGrid({
  charts,
  canManage,
  onReorder,
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {charts.map((chart) => (
            <CustomAnalyticDashboardChartTile
              key={chart.id}
              chart={chart}
              draggable={draggable}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
