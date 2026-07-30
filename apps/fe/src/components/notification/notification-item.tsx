import { formatRelativeTime, type NotificationDto } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { X } from "lucide-react";

type NotificationItemProps = {
  notification: NotificationDto;
  onSelect: (notification: NotificationDto) => void;
  onDelete: (id: string) => void;
};

export const NotificationItem = ({
  notification,
  onSelect,
  onDelete,
}: NotificationItemProps) => {
  const isUnread = !notification.readAt;

  return (
    <div
      className={cn(
        "group flex items-start gap-2 border-b px-3 py-2.5 last:border-b-0",
        isUnread ? "bg-accent/40" : "bg-transparent"
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(notification)}
        className="flex-1 space-y-1 text-left"
      >
        <div className="flex items-center gap-2">
          {isUnread && (
            <span className="size-1.5 shrink-0 rounded-full bg-primary" />
          )}
          <p className="text-sm font-medium leading-tight">
            {notification.title}
          </p>
        </div>
        {notification.body && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {notification.body}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          {notification.actor ? `${notification.actor.name} - ` : ""}
          {formatRelativeTime(notification.createdAt)}
        </p>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="size-6 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onDelete(notification.id)}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
};
