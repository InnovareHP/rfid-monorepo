import type {
  MonthlyPoint,
  TrendDelta,
} from "@/lib/helper/analytics-chart-data";
import { Card, CardContent } from "@dashboard/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@dashboard/ui/components/chart";
import { useId } from "react";
import { Area, AreaChart, CartesianGrid } from "recharts";
import { TrendPill } from "./trend-pill";

type KpiStatTileProps = {
  label: string;
  value: string;
  seriesLabel?: string;
  delta?: TrendDelta;
  series?: MonthlyPoint[];
};

export function KpiStatTile({
  label,
  value,
  seriesLabel = "Referrals",
  delta,
  series,
}: KpiStatTileProps) {
  const chartConfig = {
    total: { label: seriesLabel, color: "var(--color-chart-seq-3)" },
  } satisfies ChartConfig;

  const gradientId = `kpi-area-${useId().replace(/:/g, "")}`;
  const hasSeries = (series?.length ?? 0) > 1;

  return (
    <Card className="gap-0 rounded-2xl border py-5 shadow-sm">
      <CardContent className="flex h-full flex-col px-5 py-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-base font-medium text-foreground">{label}</p>
          {delta ? <TrendPill delta={delta} /> : null}
        </div>

        <p className="page-title mt-0.5 pb-3 text-[2.5rem] leading-tight font-bold tabular-nums">
          {value}
        </p>

        {hasSeries ? (
          <ChartContainer
            config={chartConfig}
            className="mt-auto aspect-auto h-48 w-full"
          >
            <AreaChart
              data={series}
              margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-chart-seq-2)"
                    stopOpacity={0.75}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-chart-seq-1)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent labelKey="label" />}
              />
              <Area
                dataKey="total"
                type="natural"
                stroke="var(--color-total)"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : null}
      </CardContent>
    </Card>
  );
}
