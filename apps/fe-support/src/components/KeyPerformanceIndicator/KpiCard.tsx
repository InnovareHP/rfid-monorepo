import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { cn } from "@dashboard/ui/lib/utils";

type TrendDirection = "up" | "down" | "neutral";

type KpiCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trendLabel?: string;
  trendDirection?: TrendDirection;
  iconBgClassName?: string;
  iconColorClassName?: string;
};

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trendLabel,
  trendDirection = "neutral",
  iconBgClassName,
  iconColorClassName,
}: KpiCardProps) {
  const TrendIcon =
    trendDirection === "up"
      ? ArrowUpRight
      : trendDirection === "down"
        ? ArrowDownRight
        : ArrowRight;

  const trendColor =
    trendDirection === "up"
      ? "text-emerald-600"
      : trendDirection === "down"
        ? "text-rose-600"
        : "text-slate-500";

  const trendBg =
    trendDirection === "up"
      ? "bg-emerald-50"
      : trendDirection === "down"
        ? "bg-rose-50"
        : "bg-slate-50";

  const iconBg = iconBgClassName ?? "bg-blue-50";
  const iconColor = iconColorClassName ?? "text-blue-600";

  return (
    <Card className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-150">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">
          {title}
        </CardTitle>
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              iconBg
            )}
          >
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-semibold tracking-tight text-slate-900">
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 leading-relaxed">{subtitle}</p>
        )}
        {trendLabel && (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              trendBg,
              trendColor
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

