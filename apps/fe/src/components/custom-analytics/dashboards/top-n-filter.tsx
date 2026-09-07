import type { CustomAnalyticChartType } from "@/services/custom-analytics/custom-analytics-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";

// Ten is the cap because it is also the server's default group limit, so a
// larger option would rank the same rows it already shows.
const TOP_N_OPTIONS = [3, 5, 10];

// Only BAR and PIE consult groupLimit; on any other chart type the control
// would be a dead affordance.
const RANKED_CHART_TYPES: CustomAnalyticChartType[] = ["BAR", "PIE"];

// A chart named "Top 10 Referring Facilities" is claiming a rank in its own
// title, which is the only signal that cutting it shorter is meaningful.
const NAMES_A_RANK = /\btop\b/i;

export const supportsTopN = (
  name: string,
  chartType: CustomAnalyticChartType
) => NAMES_A_RANK.test(name) && RANKED_CHART_TYPES.includes(chartType);

type TopNFilterProps = {
  value: number | null;
  onChange: (topN: number) => void;
};

// Overrides the chart's saved group limit for this read only, the same way the
// date filter overrides its saved range. Nothing is written back.
export function TopNFilter({ value, onChange }: TopNFilterProps) {
  return (
    <Select
      value={value ? String(value) : undefined}
      onValueChange={(next) => onChange(Number(next))}
    >
      <SelectTrigger size="sm" className="h-7 w-24 text-xs">
        <SelectValue placeholder="Top" />
      </SelectTrigger>
      <SelectContent>
        {TOP_N_OPTIONS.map((option) => (
          <SelectItem key={option} value={String(option)}>
            Top {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
