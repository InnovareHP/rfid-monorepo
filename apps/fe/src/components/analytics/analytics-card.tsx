import type { LiaisonAnalyticsCardData } from "@dashboard/shared";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { Flame } from "lucide-react";

type Props = {
  data: LiaisonAnalyticsCardData;
};

const ENGAGEMENT_TONE = {
  High: "bg-brand text-white",
  Medium: "bg-chart-seq-2 text-white",
  Low: "bg-muted-foreground text-white",
} as const;

// Interactions are scored against a full book of 100 for the header bar.
const INTERACTION_TARGET = 100;

function CountPill({ value }: { value: number }) {
  return (
    <span className="rounded-full bg-brand/5 px-2.5 py-0.5 text-xs font-medium text-brand tabular-nums">
      {value}
    </span>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xl font-semibold tabular-nums text-foreground">
        {(value ?? 0).toLocaleString()}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-brand/10">
      <div
        className="h-full rounded-full bg-chart-seq-2"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function TagList({ values, emptyMessage }: { values: string[]; emptyMessage: string }) {
  if (values.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded-md bg-brand/5 px-2.5 py-1 text-xs font-medium text-chart-seq-2"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

export function LiaisonAnalyticsCard({ data }: Props) {
  const progressPercentage = Math.min(
    (data.totalInteractions / INTERACTION_TARGET) * 100,
    100
  );

  return (
    <Card className="h-full gap-0 rounded-2xl border py-5 shadow-sm">
      <CardContent className="space-y-5 px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">
              {data.memberName}
            </p>
            <p className="text-xs text-muted-foreground">Liaison Performance</p>
          </div>

          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${ENGAGEMENT_TONE[data.engagementLevel]}`}
          >
            <Flame className="size-3.5" aria-hidden="true" />
            {data.engagementLevel}
          </span>
        </div>

        <div className="space-y-3 rounded-xl border border-chart-seq-2/30 bg-brand/[0.03] p-4">
          <div>
            <p className="page-title text-3xl font-bold tabular-nums">
              {data.totalInteractions}
            </p>
            <p className="text-xs text-muted-foreground">Total Interactions</p>
          </div>
          <ProgressBar percent={progressPercentage} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBlock label="Referrals assigned" value={data.totalReferrals} />
          <StatBlock label="Admissions" value={data.admissions} />
          <StatBlock
            label="From own facilities"
            value={data.ownFacilityReferrals}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              Facilities Covered
            </p>
            <CountPill value={data.facilitiesCovered.length} />
          </div>
          <TagList
            values={data.facilitiesCovered}
            emptyMessage="No facilities logged"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">
              People Contacted
            </p>
            <CountPill value={data.peopleContacted.length} />
          </div>
          <TagList
            values={data.peopleContacted}
            emptyMessage="No contacts logged"
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Touchpoints Used
          </p>

          {data.touchpointsUsed.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No touchpoints recorded
            </p>
          ) : (
            data.touchpointsUsed.map((touchpoint) => (
              <div key={touchpoint.type} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground capitalize">
                    {touchpoint.type.replace(/_/g, " ")}
                  </span>
                  <CountPill value={touchpoint.count} />
                </div>
                <ProgressBar
                  percent={
                    data.totalInteractions
                      ? (touchpoint.count / data.totalInteractions) * 100
                      : 0
                  }
                />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
