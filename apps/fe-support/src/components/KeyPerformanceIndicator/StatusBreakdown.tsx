import type { TicketStats } from "@dashboard/shared";
import { Skeleton } from "@dashboard/ui/components/skeleton";

const ROWS = [
  { key: "open", label: "Open", dot: "bg-info" },
  { key: "inProgress", label: "In progress", dot: "bg-warning" },
  { key: "resolved", label: "Resolved", dot: "bg-success" },
  { key: "closed", label: "Closed", dot: "bg-muted-foreground" },
] as const;

type StatusBreakdownProps = {
  stats: TicketStats | undefined;
  loading: boolean;
};

export function StatusBreakdown({ stats, loading }: StatusBreakdownProps) {
  if (loading || !stats) {
    return (
      <div className="space-y-3">
        {ROWS.map((row) => (
          <Skeleton key={row.key} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      {ROWS.map((row) => (
        <div key={row.key} className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${row.dot}`} />
            {row.label}
          </span>
          <span className="font-medium text-foreground">{stats[row.key]}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-muted-foreground">Total</span>
        <span className="font-medium text-foreground">{stats.total}</span>
      </div>
    </div>
  );
}
