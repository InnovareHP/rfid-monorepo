import { DEFAULT_RANK_LIMIT } from "@/lib/helper/analytics-chart-data";
import type { OutreachAnalytics } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { ChartCard } from "./chart-card";

type EmergingSourcesCardProps = {
  sources: OutreachAnalytics[];
  limit?: number;
};

export function EmergingSourcesCard({
  sources,
  limit = DEFAULT_RANK_LIMIT,
}: EmergingSourcesCardProps) {
  const rows = sources.slice(0, limit);
  const hidden = sources.length - rows.length;

  return (
    <ChartCard title="Emerging Referral Sources">
      {sources.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No emerging sources detected
        </p>
      ) : (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {rows.map((source, index) => (
            <div
              key={`${source.facility ?? "unknown"}-${index}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-brand/10 bg-brand/5 px-4 py-3"
            >
              <span className="truncate text-sm font-medium">
                {source.facility ?? "Unknown"}
              </span>
              <Badge className="bg-brand tabular-nums hover:bg-brand">
                {source.recent_referrals}
              </Badge>
            </div>
          ))}

          {/* A capped list that says nothing reads as the whole list. */}
          {hidden > 0 && (
            <p className="pt-1 text-xs text-muted-foreground">
              Showing {rows.length} of {sources.length}
            </p>
          )}
        </div>
      )}
    </ChartCard>
  );
}
