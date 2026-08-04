import { Card, CardContent } from "@dashboard/ui/components/card";
import type { ReactNode } from "react";

export function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {action}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function StatTile({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-xl shadow-sm">
      <CardContent className="space-y-3 p-5">
        <p className="text-sm text-foreground">{label}</p>
        {children}
      </CardContent>
    </Card>
  );
}
