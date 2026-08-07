import { FILETYPE } from "@/lib/fe-helpers";
import { formatDateTime } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { ArrowRight, Clock, FileText, RotateCcw } from "lucide-react";

export type HistoryItem = {
  id: string;
  action: string;
  column: string;
  oldValue: string | null;
  newValue: string | null;
  createdBy: string;
  createdAt: string;
};

// Create and delete are the only actions that earn a colour of their own.
const TONE_BY_ACTION: Record<string, string> = {
  create: "bg-success text-background",
  delete: "bg-destructive text-background",
};

const BADGE_TONE_BY_ACTION: Record<string, string> = {
  create: "border-success/40 bg-success/10 text-success",
  delete: "border-destructive/40 bg-destructive/10 text-destructive",
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export const HistoryTimelineItem = ({
  item,
  onRestore,
  isRestoring,
}: {
  item: HistoryItem;
  onRestore: (item: HistoryItem) => void;
  isRestoring: boolean;
}) => {
  const action = item.action.toLowerCase();
  const Icon = FILETYPE[item.action as keyof typeof FILETYPE] || FILETYPE.update;
  const tone = TONE_BY_ACTION[action] ?? "bg-primary text-primary-foreground";
  const badgeTone =
    BADGE_TONE_BY_ACTION[action] ?? "border-primary/40 bg-primary/10 text-primary";
  const canRestore = action === "update" || action === "delete";

  return (
    <div className="relative pl-12">
      <div
        className={cn(
          "absolute left-0 flex size-10 items-center justify-center rounded-full border-4 border-background",
          tone
        )}
      >
        <Icon className="size-4" />
      </div>

      <div className="rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-xs font-semibold",
                tone
              )}
            >
              {initials(item.createdBy)}
            </div>

            <div>
              <p className="text-sm font-medium text-foreground">
                {item.createdBy}
              </p>
              <Badge
                variant="outline"
                className={cn("mt-1 text-xs font-medium", badgeTone)}
              >
                {item.action.charAt(0).toUpperCase() + item.action.slice(1)}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {formatDateTime(item.createdAt)}
            </span>

            {canRestore && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-2"
                onClick={() => onRestore(item)}
                disabled={isRestoring}
              >
                <RotateCcw className="size-3.5" />
                Restore
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">{item.column}</p>
          </div>

          {item.oldValue && item.newValue ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-sm text-destructive">
                {item.oldValue}
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
              <span className="rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-sm text-success">
                {item.newValue}
              </span>
            </div>
          ) : (
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {item.oldValue || item.newValue || "No value"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
