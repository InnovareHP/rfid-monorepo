import type { RecordReferralStats } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
} from "@dashboard/ui/components/card";
import { Separator } from "@dashboard/ui/components/separator";
import { Send } from "lucide-react";

// Matches the tiering in the analytics referral source scorecard.
const TIER_BADGE: Record<RecordReferralStats["tier"], string> = {
  "Tier 1": "bg-success/10 text-success border-success/30",
  "Tier 2": "bg-warning/10 text-warning border-warning/30",
  Infrequent: "bg-muted text-muted-foreground border-border",
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

export function ReferralActivityCard({
  referrals,
}: {
  referrals: RecordReferralStats;
}) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-md bg-primary p-2">
            <Send className="size-4 text-primary-foreground" />
          </div>
          <h4 className="text-base font-semibold text-foreground">
            Referrals Sent
          </h4>
          <Badge
            variant="outline"
            className={`ml-auto px-2.5 py-1 font-semibold ${TIER_BADGE[referrals.tier]}`}
          >
            {referrals.tier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <p className="text-3xl font-semibold text-primary">
            {referrals.count}
          </p>
          <span className="text-xs text-muted-foreground">
            referrals from this facility
          </span>
        </div>

        <Separator />

        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Referrals per week</dt>
            <dd className="font-medium text-foreground">
              {referrals.perWeek}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">First referral</dt>
            <dd className="font-medium text-foreground">
              {formatDate(referrals.firstReferralAt)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Most recent</dt>
            <dd className="font-medium text-foreground">
              {formatDate(referrals.lastReferralAt)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
