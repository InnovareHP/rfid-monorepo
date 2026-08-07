import {
  useNotificationMutations,
  useNotifications,
  useUnreadNotificationCount,
} from "@/hooks/use-notifications";
import type { NotificationDto } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { ScrollArea } from "@dashboard/ui/components/scroll-area";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";
import { NotificationItem } from "./notification-item";

export const NotificationBell = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: unread } = useUnreadNotificationCount();
  const { data, isLoading } = useNotifications(false, 20);
  const { markReadMutation, markAllReadMutation, deleteMutation } =
    useNotificationMutations();

  const notifications = data?.data ?? [];
  const unreadCount = unread?.count ?? 0;

  const handleSelect = (notification: NotificationDto) => {
    if (!notification.readAt) {
      markReadMutation.mutate([notification.id]);
    }
    if (notification.link) {
      setOpen(false);
      navigate({ to: notification.link });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 size-4 justify-center rounded-full p-0 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-90 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-96">
          {isLoading && (
            <div className="space-y-2 p-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          )}

          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onSelect={handleSelect}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
