import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { cn } from "@dashboard/ui/lib/utils";
import { type LucideIcon } from "lucide-react";

type KpiCardProps = {
  title: string;
  value: number | string | null;
  loading: boolean;
  subtitle?: string;
  suffix?: string;
  icon?: LucideIcon;
  iconBgClassName?: string;
  iconColorClassName?: string;
};

export function KpiCard({
  title,
  value,
  loading,
  subtitle,
  suffix,
  icon: Icon,
  iconBgClassName = "bg-primary/10",
  iconColorClassName = "text-primary",
}: KpiCardProps) {
  return (
    <Card className="border border-border shadow-sm transition-shadow duration-150 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-foreground">
          {title}
        </CardTitle>
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              iconBgClassName
            )}
          >
            <Icon className={cn("h-4 w-4", iconColorClassName)} />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tracking-tight text-foreground">
              {value ?? "—"}
            </span>
            {suffix && value !== null && (
              <span className="text-xs text-muted-foreground">{suffix}</span>
            )}
          </div>
        )}
        {subtitle && (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
