import type { ReferralSourceScore } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { ChartCard } from "./chart-card";

const TIER_CONFIG = {
  "Tier 1": { color: "bg-brand/10 text-brand", label: "Always Refers" },
  "Tier 2": {
    color: "bg-chart-seq-2/10 text-chart-seq-2",
    label: "Frequently Refers",
  },
  Infrequent: { color: "bg-muted text-muted-foreground", label: "Infrequent" },
} as const;

type ScorecardCardProps = {
  sources: ReferralSourceScore[];
};

export function ScorecardCard({ sources }: ScorecardCardProps) {
  return (
    <ChartCard title="Referral Source Scorecard">
      {sources.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No scorecard data available
        </p>
      ) : (
        <div className="max-h-72 overflow-auto rounded-xl border">
          <div className="grid min-w-[28rem] grid-cols-4 gap-2 bg-brand/5 px-4 py-3 text-xs font-medium text-foreground">
            <span>Source</span>
            <span>Tier</span>
            <span className="text-right">Referrals</span>
            <span className="text-right">Per Week</span>
          </div>

          {sources.map((source, index) => (
            <div
              key={`${source.sourceName}-${index}`}
              className="grid min-w-[28rem] grid-cols-4 items-center gap-2 border-t px-4 py-3"
            >
              <span
                className="truncate text-sm font-medium"
                title={source.sourceName}
              >
                {source.sourceName}
              </span>
              <Badge
                className={`w-fit px-1.5 py-0 text-[10px] ${TIER_CONFIG[source.tier].color}`}
              >
                {TIER_CONFIG[source.tier].label}
              </Badge>
              <span className="text-right text-sm font-semibold tabular-nums">
                {source.referralCount}
              </span>
              <span className="text-right text-sm text-muted-foreground tabular-nums">
                {source.referralsPerWeek}
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartCard>
  );
}
