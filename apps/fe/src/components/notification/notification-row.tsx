import { formatRelativeTime, type NotificationDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  Megaphone,
  TriangleAlert,
  UserRoundPlus,
  X,
} from "lucide-react";

// The leading glyph is chosen from the type prefix, so a new notification kind
// gets a sensible icon without touching this file.
const iconFor = (type: string) => {
  if (type.startsWith("booking")) return CalendarDays;
  if (type.startsWith("task")) return ClipboardList;
  if (type.startsWith("referral") || type.startsWith("lead"))
    return UserRoundPlus;
  if (type.startsWith("blast") || type.startsWith("campaign")) return Megaphone;
  return Bell;
};

const isFailure = (type: string) =>
  type.endsWith("failed") || type.endsWith("overdue");

type NotificationRowProps = {
  notification: NotificationDto;
  onSelect: (notification: NotificationDto) => void;
  onDelete: (id: string) => void;
};

export const NotificationRow = ({
  notification,
  onSelect,
  onDelete,
}: NotificationRowProps) => {
  const Icon = isFailure(notification.type)
    ? TriangleAlert
    : iconFor(notification.type);
  const isUnread = !notification.readAt;
  const failed = isFailure(notification.type);

  return (
    <div
      className={cn(
        "group flex items-start gap-3 border-b px-4 py-3 last:border-b-0",
        isUnread ? "bg-muted/40" : "bg-background"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-4 size-2 shrink-0 rounded-full",
          isUnread ? "bg-primary" : "bg-transparent"
        )}
      />

      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          failed
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary"
        )}
      >
        <Icon className="size-5" />
      </span>

      <button
        type="button"
        onClick={() => onSelect(notification)}
        className="min-w-0 flex-1 space-y-0.5 text-left"
      >
        <p className="font-semibold leading-tight text-foreground">
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-sm text-foreground">{notification.body}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {notification.actor ? `${notification.actor.name} - ` : ""}
          {formatRelativeTime(notification.createdAt)}
        </p>
      </button>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Dismiss notification"
        className="size-7 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onDelete(notification.id)}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
};
