import { FollowUpDetailRow } from "@/components/follow-up/follow-up-detail-row";
import { WriteGate } from "@/components/write-gate";
import {
  followUpBucket,
  formatFollowUpDate,
} from "@/lib/helper/follow-up-date";
import { modulePath } from "@/lib/helper/module-route";
import { completeActivity } from "@/services/lead/lead-service";
import type {
  FollowUpDigest,
  FollowUpRow,
} from "@/services/follow-up/follow-up-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Spinner } from "@dashboard/ui/components/spinner";
import { cn } from "@dashboard/ui/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { memo } from "react";
import { toast } from "sonner";

// The queue is an infinite query, so an optimistic edit rewrites every page.
type InfiniteFollowUps = { pages: FollowUpDigest[]; pageParams: unknown[] };

const FOLLOW_UPS_KEY = ["follow-ups"];

type FollowUpCardProps = {
  row: FollowUpRow;
  team: string;
  showOpenLink?: boolean;
};

export const FollowUpCard = memo(function FollowUpCard({
  row,
  team,
  showOpenLink = true,
}: FollowUpCardProps) {
  const queryClient = useQueryClient();
  const followUp = row.followUp;
  const bucket = followUp ? followUpBucket(followUp.dueDate) : null;
  const bucketKey = bucket === "week" ? "upcoming" : (bucket ?? "today");
  // A module path is only known at runtime, so the link is a plain string.
  const recordHref: string = `/${team}/${modulePath(row.moduleType)}`;

  const completeMutation = useMutation({
    mutationFn: (activityId: string) => completeActivity(activityId),
    // The card leaves the queue at once rather than after a refetch of every
    // page loaded so far.
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: FOLLOW_UPS_KEY });
      const previous = queryClient.getQueriesData({ queryKey: FOLLOW_UPS_KEY });

      queryClient.setQueriesData(
        { queryKey: FOLLOW_UPS_KEY },
        (old: InfiniteFollowUps | undefined) =>
          old
            ? {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  data: page.data.filter(
                    (entry) => entry.recordId !== row.recordId
                  ),
                  buckets: page.buckets && {
                    ...page.buckets,
                    [bucketKey]: Math.max(
                      0,
                      page.buckets[bucketKey] - 1
                    ),
                    total: Math.max(0, page.buckets.total - 1),
                  },
                })),
              }
            : old
      );

      return { previous };
    },
    onError: (_error, _activityId, context) => {
      context?.previous?.forEach(([key, data]) =>
        queryClient.setQueryData(key, data)
      );
      toast.error("Could not complete this follow-up.");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["record-follow-up", row.recordId],
      });
      queryClient.invalidateQueries({ queryKey: ["activities", row.recordId] });
      toast.success("Follow-up marked done.");
    },
    // The row is gone locally; the totals still come from the server.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FOLLOW_UPS_KEY });
    },
  });

  return (
    <Card
      className={cn(
        "border-l-4",
        bucket === "overdue" ? "border-l-destructive" : "border-l-primary"
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <CardTitle className="min-w-0 truncate text-base">
          {row.recordName}
        </CardTitle>
        <Badge variant="secondary" className="shrink-0 font-normal">
          {row.moduleLabel}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-2">
        <FollowUpDetailRow
          label="Last contacted"
          value={formatFollowUpDate(row.lastContactedAt)}
        />
        <FollowUpDetailRow
          label="Referral received"
          value={formatFollowUpDate(row.referralReceivedAt)}
        />
        <FollowUpDetailRow
          label="Follow-up required"
          value={followUp ? formatFollowUpDate(followUp.dueDate) : "None set"}
          tone={bucket === "overdue" ? "overdue" : "due"}
        />
        <FollowUpDetailRow
          label="Assigned to"
          value={row.assignedTo?.name ?? "Unassigned"}
        />

        {followUp && (
          <p className="truncate pt-1 text-sm text-muted-foreground">
            {followUp.title}
          </p>
        )}

        <div className="flex items-center gap-2 pt-2">
          {followUp && (
            <WriteGate>
              <Button
                size="sm"
                variant="outline"
                disabled={completeMutation.isPending}
                onClick={() => completeMutation.mutate(followUp.activityId)}
              >
                {completeMutation.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Mark done
              </Button>
            </WriteGate>
          )}

          {showOpenLink && (
            <Button size="sm" variant="ghost" asChild>
              <Link to={recordHref} search={{ q: row.recordName }}>
                Open record
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
