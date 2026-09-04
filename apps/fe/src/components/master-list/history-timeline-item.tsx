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
  // Rows written by one action share this, so a status change and the reason
  // and action date it stamped read as a single entry.
  groupId: string | null;
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

// Rows arrive newest first. Ungrouped rows stay on their own, so history
// written before groupId existed reads exactly as it did.
export const groupHistory = (items: HistoryItem[]): HistoryItem[][] => {
  const groups: HistoryItem[][] = [];
  const byGroupId = new Map<string, HistoryItem[]>();

  for (const item of items) {
    if (!item.groupId) {
      groups.push([item]);
      continue;
    }

    const existing = byGroupId.get(item.groupId);
    if (existing) {
      existing.push(item);
      continue;
    }

    const group = [item];
    byGroupId.set(item.groupId, group);
    groups.push(group);
  }

  return groups;
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export const HistoryTimelineItem = ({
  items,
  onRestore,
  isRestoring,
}: {
  items: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  isRestoring: boolean;
}) => {
  const [item] = items;
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

          </div>
        </div>

        {items.map((change) => (
          <div key={change.id} className="mt-4 border-t pt-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">
                  {change.column}
                </p>
              </div>

              {canRestore && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-2"
                  onClick={() => onRestore(change)}
                  disabled={isRestoring}
                >
                  <RotateCcw className="size-3.5" />
                  Restore
                </Button>
              )}
            </div>

            {change.oldValue && change.newValue ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-sm text-destructive">
                  {change.oldValue}
                </span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                <span className="rounded-md border border-success/30 bg-success/10 px-2.5 py-1 text-sm text-success">
                  {change.newValue}
                </span>
              </div>
            ) : (
              <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                {change.oldValue || change.newValue || "No value"}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
