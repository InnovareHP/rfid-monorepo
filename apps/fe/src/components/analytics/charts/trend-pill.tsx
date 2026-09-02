import type { TrendDelta } from "@/lib/helper/analytics-chart-data";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

type TrendPillProps = {
  delta: TrendDelta;
  caption?: string;
  positiveDirection?: "up" | "down";
};

const ICONS = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

const SIGNS = {
  up: "+",
  down: "-",
  flat: "",
} as const;

export function TrendPill({
  delta,
  caption = "This Month",
  positiveDirection = "up",
}: TrendPillProps) {
  const Icon = ICONS[delta.direction];

  // No change is neither good nor bad, so it stays neutral instead of
  // rendering as a red -0.0% decline.
  const tone =
    delta.direction === "flat"
      ? "text-muted-foreground"
      : delta.direction === positiveDirection
        ? "text-success"
        : "text-destructive";

  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs">
      <Icon className={`size-3.5 ${tone}`} aria-hidden="true" />
      <span className={`font-semibold ${tone}`}>
        {SIGNS[delta.direction]}
        {delta.absolute === undefined
          ? `${Math.abs(delta.percent).toFixed(1)}%`
          : Math.abs(delta.absolute).toLocaleString()}
      </span>
      <span className="text-muted-foreground">{caption}</span>
    </span>
  );
}
