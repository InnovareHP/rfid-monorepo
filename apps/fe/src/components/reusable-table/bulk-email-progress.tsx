import type { BoardJobStatus } from "@/services/board/board-module-service";
import { Progress } from "@dashboard/ui/components/progress";
import { Spinner } from "@dashboard/ui/components/spinner";
import { cn } from "@dashboard/ui/lib/utils";

const DONE_STATES = new Set(["completed", "failed"]);

export const isJobDone = (job?: BoardJobStatus) =>
  !!job && DONE_STATES.has(job.status);

// Live counts from the bulk-email job; numeric progress means it has not started.
export function BulkEmailProgress({
  job,
  total,
}: {
  job?: BoardJobStatus;
  total: number;
}) {
  const counts =
    job && typeof job.progress === "object"
      ? job.progress
      : { sent: 0, skipped: 0, errors: 0, total };
  const processed = counts.sent + counts.skipped + counts.errors;
  const percent = counts.total
    ? Math.round((processed / counts.total) * 100)
    : 0;
  const done = isJobDone(job);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        {!done && <Spinner size="sm" />}
        {job?.status === "failed"
          ? "Sending stopped early"
          : done
            ? "Finished sending"
            : `Sending ${processed} of ${counts.total}...`}
      </div>
      <Progress value={done ? 100 : percent} />
      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: "Sent", value: counts.sent, tone: "text-success" },
          {
            label: "Skipped",
            value: counts.skipped,
            tone: "text-muted-foreground",
          },
          { label: "Failed", value: counts.errors, tone: "text-destructive" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-md border border-border bg-muted p-3"
          >
            <dd className={cn("text-xl font-semibold", stat.tone)}>
              {stat.value}
            </dd>
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        Skipped records have no email address. Each sent email is logged on the
        record's activity and under Sent Emails.
      </p>
    </div>
  );
}
