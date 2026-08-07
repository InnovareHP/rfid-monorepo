import { countDelta } from "@/lib/helper/analytics-chart-data";
import { getBoardStats } from "@/services/lead/lead-service";
import type { BoardStats } from "@dashboard/shared";
import { useQuery } from "@tanstack/react-query";
import { KpiStatTile } from "../analytics/charts/kpi-stat-tile";

type StatKey = keyof BoardStats;

const DEFAULT_LABELS: Record<StatKey, string> = {
  totalFacilities: "Total Facilities",
  activePartners: "Active Partners",
  countiesCovered: "Counties Covered",
};

type BoardStatsStripProps = {
  moduleType?: string;
  labels?: Partial<Record<StatKey, string>>;
};

export function BoardStatsStrip({
  moduleType = "LEAD",
  labels,
}: BoardStatsStripProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["board-stats", moduleType],
    queryFn: () => getBoardStats(moduleType),
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {(Object.keys(DEFAULT_LABELS) as StatKey[]).map((key) => {
        const metric = data?.[key];

        return (
          <KpiStatTile
            key={key}
            label={labels?.[key] ?? DEFAULT_LABELS[key]}
            value={String(metric?.value ?? 0)}
            delta={metric ? countDelta(metric.value, metric.previous) : undefined}
            isLoading={isLoading}
          />
        );
      })}
    </div>
  );
}
