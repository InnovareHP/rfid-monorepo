import { CHART_MOTION } from "@/lib/helper/chart-motion";
import type { TrendDelta } from "@/lib/helper/analytics-chart-data";
import {
  ChartContainer,
  type ChartConfig,
} from "@dashboard/ui/components/chart";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { TrendPill } from "./trend-pill";

const chartConfig = {
  rate: { label: "Conversion", color: "var(--color-chart-seq-2)" },
} satisfies ChartConfig;

type ConversionGaugeProps = {
  rate: number;
  caption?: string;
  delta?: TrendDelta;
};

export function ConversionGauge({
  rate,
  caption,
  delta,
}: ConversionGaugeProps) {
  const clamped = Math.max(0, Math.min(100, rate));

  return (
    <div className="relative">
      <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
        <RadialBarChart
          data={[{ name: "rate", rate: clamped }]}
          startAngle={225}
          endAngle={-45}
          innerRadius="74%"
          outerRadius="100%"
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            dataKey="rate"
            angleAxisId={0}
            cornerRadius={12}
            fill="var(--color-rate)"
            background={{ fill: "var(--color-muted)" }}
            {...CHART_MOTION}
          />
        </RadialBarChart>
      </ChartContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-brand tabular-nums">
          {clamped.toFixed(0)}%
        </span>
        {delta ? (
          <span className="mt-1">
            <TrendPill delta={delta} />
          </span>
        ) : caption ? (
          <span className="mt-1 text-xs text-muted-foreground">{caption}</span>
        ) : null}
      </div>
    </div>
  );
}
