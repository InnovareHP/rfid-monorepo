import { getBlastJobStatus } from "@/services/marketing/blast-service";
import { Progress } from "@dashboard/ui/components/progress";
import { useQuery } from "@tanstack/react-query";

const TERMINAL_STATES = new Set(["completed", "failed"]);

type BlastSendProgressProps = {
  jobId: string;
};

export const BlastSendProgress = ({ jobId }: BlastSendProgressProps) => {
  const { data } = useQuery({
    queryKey: ["marketing-blast-job-status", jobId],
    queryFn: () => getBlastJobStatus(jobId),
    refetchInterval: (query) =>
      query.state.data && TERMINAL_STATES.has(query.state.data.status)
        ? false
        : 1500,
  });

  if (!data) return null;

  const progress = data.progress as
    | { sent: number; failed: number; total: number }
    | undefined;
  const total = progress?.total ?? data.result?.total ?? 0;
  const done = (progress?.sent ?? 0) + (progress?.failed ?? 0);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-900">
          {data.status === "completed"
            ? "Send complete"
            : data.status === "failed"
              ? "Send failed"
              : "Sending..."}
        </span>
        <span className="text-gray-500">
          {done}/{total}
        </span>
      </div>
      <Progress value={percent} />
      {data.result && (
        <p className="text-xs text-gray-500">
          {data.result.sent} sent, {data.result.failed} failed
        </p>
      )}
      {data.status === "failed" && data.failedReason && (
        <p className="text-xs text-red-500">{data.failedReason}</p>
      )}
    </div>
  );
};
