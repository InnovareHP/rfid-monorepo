import { sequentialRampColor } from "@/lib/color-utils";
import type { CategoryRow } from "@/lib/helper/analytics-chart-data";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@dashboard/ui/components/chart";
import { Cell, Pie, PieChart } from "recharts";
import type { PieLabelRenderProps } from "recharts/types/polar/Pie";

// Anything past the last slot folds into a single "Other" slice.
const MAX_SLICES = 5;

const OTHER_COLOR = "var(--color-muted-foreground)";
const OTHER_LABEL = "Other";

type PieSlice = {
  key: string;
  name: string;
  value: number;
  color: string;
};

type CategoryPieProps = {
  data: CategoryRow[];
  variant?: "pie" | "donut";
  emptyMessage?: string;
};

// Slices thinner than this cannot hold a readable in-slice label.
const MIN_LABEL_SHARE = 0.06;

const RADIAN = Math.PI / 180;

const LABEL_LINE_HEIGHT = 14;
const LABEL_OFFSET = 14;

// CSS custom properties cannot contain spaces, so config keys are slugged.
function slugify(name: string, index: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `slice-${index}`;
}

function toSlices(data: CategoryRow[]): PieSlice[] {
  const sorted = [...data].sort((a, b) => b.value - a.value);

  const rows =
    sorted.length <= MAX_SLICES
      ? sorted
      : [
          ...sorted.slice(0, MAX_SLICES - 1),
          {
            name: OTHER_LABEL,
            value: sorted
              .slice(MAX_SLICES - 1)
              .reduce((sum, row) => sum + row.value, 0),
          },
        ];

  return rows.map((row, index) => ({
    key: slugify(row.name, index),
    name: row.name,
    value: row.value,
    color:
      row.name === OTHER_LABEL
        ? OTHER_COLOR
        : sequentialRampColor(index, rows.length),
  }));
}

// Donut bands are too narrow for text, so those labels sit outside the ring.
function makeSliceLabel(variant: "pie" | "donut") {
  return function renderSliceLabel(props: PieLabelRenderProps) {
    if ((props.percent ?? 0) < MIN_LABEL_SHARE) return null;

    const cx = Number(props.cx);
    const cy = Number(props.cy);
    const innerRadius = Number(props.innerRadius);
    const outerRadius = Number(props.outerRadius);
    const midAngle = Number(props.midAngle);
    const slice = props.payload as unknown as PieSlice;

    const isDonut = variant === "donut";
    const radius = isDonut
      ? outerRadius + LABEL_OFFSET
      : innerRadius + (outerRadius - innerRadius) * 0.62;

    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const anchor = isDonut ? (x >= cx ? "start" : "end") : "middle";
    const tone = isDonut ? "fill-foreground" : "fill-white";

    // One word per line keeps long names off their neighbours.
    const words = slice.name.split(" ");
    const top = y - ((words.length - 1) * LABEL_LINE_HEIGHT) / 2;

    return (
      <text
        x={x}
        y={top}
        textAnchor={anchor}
        dominantBaseline="central"
        className={`${tone} text-xs font-medium`}
      >
        {words.map((word, index) => (
          <tspan
            key={`${word}-${index}`}
            x={x}
            dy={index === 0 ? 0 : LABEL_LINE_HEIGHT}
          >
            {word}
          </tspan>
        ))}
      </text>
    );
  };
}

export function CategoryPie({
  data,
  variant = "donut",
  emptyMessage = "No data available",
}: CategoryPieProps) {
  const slices = toSlices(data);
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  if (slices.length === 0 || total === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const chartConfig = slices.reduce<ChartConfig>((config, slice) => {
    config[slice.key] = { label: slice.name, color: slice.color };
    return config;
  }, {});

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
      <PieChart
        margin={
          variant === "donut"
            ? { top: 8, right: 72, bottom: 8, left: 72 }
            : { top: 8, right: 8, bottom: 8, left: 8 }
        }
      >
        <ChartTooltip content={<ChartTooltipContent nameKey="key" />} />
        <Pie
          data={slices}
          dataKey="value"
          nameKey="key"
          innerRadius={variant === "donut" ? 56 : 0}
          outerRadius={variant === "donut" ? 92 : 108}
          paddingAngle={0}
          stroke="none"
          label={makeSliceLabel(variant)}
          labelLine={false}
        >
          {slices.map((slice) => (
            <Cell key={slice.key} fill={slice.color} />
          ))}
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
