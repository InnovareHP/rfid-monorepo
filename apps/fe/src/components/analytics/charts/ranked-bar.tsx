import { chartMotion } from "@/lib/helper/chart-motion";
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

// A horizontal band has to be tall enough for its own label. The height used
// to be fixed, so a custom analytic at its groupLimit of 50 squeezed 50 names
// into 320px and they sat on top of each other.
const BAND_HEIGHT = 28;
const COMPACT_BAND_HEIGHT = 18;
const X_AXIS_HEIGHT = 28;
const PLOT_HEIGHT = 320;
const COMPACT_PLOT_HEIGHT = 160;

// What fits in the width reserved for the category axis at each font size. A
// facility name longer than this used to run past the axis into the bars.
const LABEL_CHARS = 24;
const COMPACT_LABEL_CHARS = 14;

// The column layout renders every tick (interval 0) side by side, so its
// budget is per-label horizontal room rather than the axis width.
const COLUMN_LABEL_CHARS = 12;
const COMPACT_COLUMN_LABEL_CHARS = 8;

const truncateLabel = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

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
    const viewportHeight = compact ? COMPACT_PLOT_HEIGHT : PLOT_HEIGHT;
    const bandHeight = compact ? COMPACT_BAND_HEIGHT : BAND_HEIGHT;
    const maxChars = compact ? COMPACT_LABEL_CHARS : LABEL_CHARS;

    // Grows past the viewport rather than compressing the bands, and the
    // wrapper scrolls. Native overflow, not ScrollArea, so the scrollbar is
    // reachable on a touch screen.
    const chartHeight = Math.max(
      viewportHeight,
      rows.length * bandHeight + X_AXIS_HEIGHT
    );

    return (
      <div
        className="w-full overflow-y-auto"
        // Runtime heights: both come from how many rows this chart was given.
        style={{ maxHeight: viewportHeight }}
      >
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full"
          style={{ height: chartHeight }}
        >
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
              width={compact ? 88 : 160}
              tickMargin={8}
              fontSize={compact ? 10 : 12}
              // Axis only: the tooltip still names the row in full.
              tickFormatter={(value: string) =>
                truncateLabel(value, maxChars)
              }
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Bar
              dataKey="count"
              radius={0}
              barSize={compact ? 12 : 22}
              {...chartMotion(compact)}
            >
              {cells}
            </Bar>
          </BarChart>
        </ChartContainer>
      </div>
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
          // interval 0 keeps every row visible, so the names have to be cut
          // to stop neighbours running together. Full name is in the tooltip.
          tickFormatter={(value: string) =>
            truncateLabel(
              value,
              compact ? COMPACT_COLUMN_LABEL_CHARS : COLUMN_LABEL_CHARS
            )
          }
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar
          dataKey="count"
          radius={0}
          maxBarSize={compact ? 32 : 64}
          {...chartMotion(compact)}
        >
          {cells}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
