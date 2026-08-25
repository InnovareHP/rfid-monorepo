import type { ImportResult } from "@/services/lead/lead-service";
import { CheckCircle2 } from "lucide-react";

type Props = {
  result: ImportResult;
  recordLabel: string;
};

export function ImportResultPanel({ result, recordLabel }: Props) {
  return (
    <div className="rounded-xl border border-success/30 bg-success/10 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-success">Import queued</p>
          <p className="text-sm text-foreground">
            <strong>{result.queuedRows}</strong> {recordLabel.toLowerCase()} are
            being imported. The board updates automatically when it finishes.
          </p>
          {/* Optional-chained on purpose: an older server that omits either
              list should degrade to a shorter summary, not crash the page. */}
          {!!result.createdColumns?.length && (
            <p className="text-xs text-muted-foreground">
              Fields created:{" "}
              <strong>{result.createdColumns.join(", ")}</strong>
            </p>
          )}
          {!!result.ignoredColumns?.length && (
            <p className="text-xs text-muted-foreground">
              Columns not imported:{" "}
              <strong>{result.ignoredColumns.join(", ")}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
