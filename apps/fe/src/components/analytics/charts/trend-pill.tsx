import type { TrendDelta } from "@/lib/helper/analytics-chart-data";
import { TrendingDown, TrendingUp } from "lucide-react";

type TrendPillProps = {
  delta: TrendDelta;
  caption?: string;
  positiveDirection?: "up" | "down";
};

export function TrendPill({
  delta,
  caption = "This Month",
  positiveDirection = "up",
}: TrendPillProps) {
  const isUp = delta.direction === "up";
  const Icon = isUp ? TrendingUp : TrendingDown;
  const isGood = delta.direction === positiveDirection;
  const tone = isGood ? "text-green-600" : "text-red-500";

  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs">
      <Icon className={`size-3.5 ${tone}`} aria-hidden="true" />
      <span className={`font-semibold ${tone}`}>
        {isUp ? "+" : "-"}
        {delta.percent.toFixed(1)}%
      </span>
      <span className="text-muted-foreground">{caption}</span>
    </span>
  );
}
