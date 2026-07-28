import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import type { ReactNode } from "react";

type ChartCardProps = {
  title: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function ChartCard({
  title,
  action,
  className,
  children,
}: ChartCardProps) {
  return (
    <Card
      className={`gap-0 rounded-2xl border shadow-sm [contain-intrinsic-size:auto_420px] [content-visibility:auto] ${className ?? ""}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base font-medium text-foreground">
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}
