import type { ImportSummary } from "@/lib/helper/marketing-import";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const MAX_PROBLEMS = 20;

type Props = {
  title: string;
  summary: ImportSummary;
  okLabel: string;
  skippedLabel: string;
};

export function MarketingImportSummary({
  title,
  summary,
  okLabel,
  skippedLabel,
}: Props) {
  const clean = summary.problems.length === 0;
  const Icon = clean ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={
        clean
          ? "rounded-xl border border-success/30 bg-success/10 p-4"
          : "rounded-xl border border-destructive/20 bg-destructive/10 p-4"
      }
    >
      <div className="flex items-start gap-3">
        <Icon
          className={
            clean
              ? "mt-0.5 h-5 w-5 shrink-0 text-success"
              : "mt-0.5 h-5 w-5 shrink-0 text-destructive"
          }
        />
        <div className="space-y-1 text-sm text-foreground">
          <p className="font-semibold">{title}</p>
          <p>
            <strong>{summary.ok}</strong> {okLabel} •{" "}
            <strong>{summary.skipped}</strong> {skippedLabel} •{" "}
            <strong>{summary.problems.length}</strong> rows to fix
          </p>
          {summary.problems.slice(0, MAX_PROBLEMS).map((problem) => (
            <p
              key={`${problem.row}-${problem.message}`}
              className="text-xs text-muted-foreground"
            >
              Row {problem.row}: {problem.message}
            </p>
          ))}
          {summary.problems.length > MAX_PROBLEMS && (
            <p className="text-xs text-muted-foreground">
              and {summary.problems.length - MAX_PROBLEMS} more.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
