import { sequentialRampColor } from "@/lib/color-utils";
import type { RankedRow } from "@/lib/helper/analytics-chart-data";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@dashboard/ui/components/chart";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

// A thumbnail shows only the leading rows; the API already sorts them desc.
const COMPACT_ROWS = 5;

type RankedBarProps = {
  data: RankedRow[];
  layout?: "vertical" | "horizontal";
  emptyMessage?: string;
  metricLabel?: string;
  compact?: boolean;
};

export function RankedBar({
  data,
  layout = "vertical",
  emptyMessage = "No data available",
  metricLabel = "Referrals",
  compact = false,
}: RankedBarProps) {
  const chartConfig = {
    count: { label: metricLabel },
  } satisfies ChartConfig;

  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const rows = compact ? data.slice(0, COMPACT_ROWS) : data;

  const cells = rows.map((row, index) => (
    <Cell key={row.name} fill={sequentialRampColor(index, rows.length)} />
  ));

  const containerClass = compact
    ? "aspect-auto h-40 w-full"
    : "aspect-auto h-80 w-full";

  if (layout === "horizontal") {
    return (
      <ChartContainer config={chartConfig} className={containerClass}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={
            compact
              ? { top: 2, right: 8, bottom: 2, left: 4 }
              : { top: 4, right: 16, bottom: 4, left: 8 }
          }
        >
          <CartesianGrid horizontal={false} stroke="var(--color-border)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            fontSize={compact ? 10 : 12}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={compact ? 88 : 140}
            tickMargin={8}
            fontSize={compact ? 10 : 12}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={0} barSize={compact ? 12 : 22}>
            {cells}
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer config={chartConfig} className={containerClass}>
      <BarChart
        data={rows}
        margin={
          compact
            ? { top: 4, right: 4, bottom: 0, left: 0 }
            : { top: 8, right: 8, bottom: 0, left: 0 }
        }
        barCategoryGap="22%"
      >
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          interval={0}
          height={compact ? 28 : 44}
          fontSize={compact ? 10 : 12}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={0} maxBarSize={compact ? 32 : 64}>
          {cells}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
