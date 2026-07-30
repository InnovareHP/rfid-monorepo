import type { TaskStats } from "@/lib/helper/task-insights";
import { KpiStatTile } from "../analytics/charts/kpi-stat-tile";

type TaskStatsStripProps = {
  stats: TaskStats;
  isLoading?: boolean;
};

export const TaskStatsStrip = ({ stats, isLoading }: TaskStatsStripProps) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <KpiStatTile
      label="Total Team Tasks"
      value={stats.total.toLocaleString()}
      isLoading={isLoading}
    />
    <KpiStatTile
      label="My Tasks"
      value={stats.mine.toLocaleString()}
      isLoading={isLoading}
    />
    <KpiStatTile
      label="Team Completion Rate"
      value={`${stats.completionRate}%`}
      isLoading={isLoading}
    />
  </div>
);
