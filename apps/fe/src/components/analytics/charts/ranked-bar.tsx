import { sequentialRampColor } from "@/lib/color-utils";
import type { RankedRow } from "@/lib/helper/analytics-chart-data";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@dashboard/ui/components/chart";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

const chartConfig = {
  count: { label: "Referrals" },
} satisfies ChartConfig;

type RankedBarProps = {
  data: RankedRow[];
  layout?: "vertical" | "horizontal";
  emptyMessage?: string;
};

export function RankedBar({
  data,
  layout = "vertical",
  emptyMessage = "No data available",
}: RankedBarProps) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const cells = data.map((row, index) => (
    <Cell key={row.name} fill={sequentialRampColor(index, data.length)} />
  ));

  if (layout === "horizontal") {
    return (
      <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid horizontal={false} stroke="var(--color-border)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            fontSize={12}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={140}
            tickMargin={8}
            fontSize={12}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
          <Bar dataKey="count" radius={0} barSize={22}>
            {cells}
          </Bar>
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-80 w-full">
      <BarChart
        data={data}
        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
        barCategoryGap="22%"
      >
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tickMargin={12}
          interval={0}
          height={44}
          fontSize={12}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="count" radius={0} maxBarSize={64}>
          {cells}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
