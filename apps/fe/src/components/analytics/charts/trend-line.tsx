import { sequentialRampColor } from "@/lib/color-utils";
import type { MonthlyPoint } from "@/lib/helper/analytics-chart-data";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@dashboard/ui/components/chart";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

const chartConfig = {
  total: { label: "Total", color: "var(--color-chart-seq-2)" },
} satisfies ChartConfig;

type TrendLineProps = {
  data: MonthlyPoint[];
  emptyMessage?: string;
  compact?: boolean;
};

type TrendDotProps = {
  cx?: number;
  cy?: number;
  payload?: MonthlyPoint;
};

export function TrendLine({
  data,
  emptyMessage = "No trend data available",
  compact = false,
}: TrendLineProps) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  // Dots ramp with magnitude: darkest at the lowest month, lightest at the peak.
  const ascending = [...data]
    .sort((a, b) => a.total - b.total)
    .map((point) => point.month);

  const renderDot = ({ cx, cy, payload }: TrendDotProps) => {
    if (!payload) return null;

    const rank = ascending.indexOf(payload.month);

    return (
      <circle
        key={payload.month}
        cx={cx}
        cy={cy}
        r={5}
        fill={sequentialRampColor(rank, data.length)}
      />
    );
  };

  return (
    <ChartContainer
      config={chartConfig}
      className={
        compact ? "aspect-auto h-40 w-full" : "aspect-auto h-64 w-full"
      }
    >
      <LineChart
        data={data}
        margin={
          compact
            ? { top: 8, right: 8, bottom: 0, left: 0 }
            : { top: 16, right: 16, bottom: 0, left: 8 }
        }
      >
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          hide={compact}
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          padding={{ left: 12, right: 12 }}
        />
        <ChartTooltip cursor content={<ChartTooltipContent labelKey="label" />} />
        <Line
          dataKey="total"
          type="natural"
          stroke="var(--color-total)"
          strokeWidth={3}
          dot={compact ? false : renderDot}
          activeDot={{ r: 7 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
