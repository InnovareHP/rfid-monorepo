import { CHART_MOTION } from "@/lib/helper/chart-motion";
import type { StatusSlice } from "@/lib/helper/analytics-chart-data";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@dashboard/ui/components/chart";
import { Cell, Pie, PieChart, Sector } from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";

type StatusDonutProps = {
  slices: StatusSlice[];
  selectedStatus?: string;
  emptyMessage?: string;
  totalLabel?: string;
  activeSuffix?: string;
};

function slugify(name: string, index: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `status-${index}`;
}

export function StatusDonut({
  slices,
  selectedStatus,
  emptyMessage = "No status data available",
  totalLabel = "Total referrals",
  activeSuffix = "Referrals",
}: StatusDonutProps) {
  if (slices.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const rows = slices.map((slice, index) => ({
    key: slugify(slice.status, index),
    name: slice.status,
    value: slice.count,
    color: slice.color,
  }));

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const activeIndex = rows.findIndex((row) => row.name === selectedStatus);
  const active = activeIndex >= 0 ? rows[activeIndex] : undefined;

  const chartConfig = rows.reduce<ChartConfig>((config, row) => {
    config[row.key] = { label: row.name, color: row.color };
    return config;
  }, {});

  return (
    <div className="relative">
      <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
          <Pie
            data={rows}
            dataKey="value"
            nameKey="key"
            innerRadius={62}
            outerRadius={96}
            paddingAngle={2}
            stroke="var(--color-background)"
            strokeWidth={2}
            {...CHART_MOTION}
            shape={(props: PieSectorShapeProps, index: number) => (
              <Sector
                {...props}
                outerRadius={
                  index === activeIndex
                    ? (props.outerRadius ?? 0) + 12
                    : props.outerRadius
                }
              />
            )}
          >
            {rows.map((row) => (
              <Cell key={row.key} fill={row.color} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        <span className="text-4xl font-bold tabular-nums text-brand">
          {(active?.value ?? total).toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">
          {active
            ? [active.name, activeSuffix].filter(Boolean).join(" ")
            : totalLabel}
        </span>
      </div>
    </div>
  );
}
