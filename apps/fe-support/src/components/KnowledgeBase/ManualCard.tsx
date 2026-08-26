import { cn } from "@dashboard/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// The one card shell the knowledge base uses, so a category tile, a featured
// article and a search hit cannot drift apart.
export function ManualCard({
  to,
  params,
  icon: Icon,
  iconBg,
  title,
  description,
  meta,
}: {
  to: string;
  params: Record<string, string>;
  icon?: LucideIcon;
  iconBg?: string;
  title: string;
  description?: string | null;
  meta?: ReactNode;
}) {
  return (
    <Link
      to={to}
      params={params}
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      {Icon && (
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            iconBg ?? "bg-primary/10"
          )}
        >
          <Icon className="size-4 text-avatar-foreground" />
        </div>
      )}

      <div className="space-y-1">
        <p className="text-sm font-bold leading-tight text-foreground">
          {title}
        </p>

        {description && (
          <p className="text-xs font-normal leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {meta}
    </Link>
  );
}
