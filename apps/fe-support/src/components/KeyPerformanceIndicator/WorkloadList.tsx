import type { TicketWorkloadRow } from "@dashboard/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@dashboard/ui/components/avatar";
import { Skeleton } from "@dashboard/ui/components/skeleton";

type WorkloadListProps = {
  rows: TicketWorkloadRow[];
  total: number;
  loading: boolean;
};

export function WorkloadList({ rows, total, loading }: WorkloadListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No active tickets assigned right now.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.userId} className="flex items-center gap-3">
          <Avatar className="size-7">
            <AvatarImage src={row.image ?? undefined} alt={row.name} />
            <AvatarFallback className="text-[10px]">
              {row.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-foreground">
                {row.name}
              </span>
              <span className="text-xs font-medium text-foreground">
                {row.activeCount}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${total > 0 ? (row.activeCount / total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
