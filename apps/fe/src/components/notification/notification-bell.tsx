import {
  useNotificationList,
  useNotificationMutations,
  useUnreadNotificationCount,
} from "@/hooks/use-notifications";
import type {
  NotificationCategoryValue,
  NotificationDto,
} from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { ScrollArea } from "@dashboard/ui/components/scroll-area";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";
import { NotificationCategoryTabs } from "./notification-category-tabs";
import { NotificationItem } from "./notification-item";

export const NotificationBell = () => {
  const navigate = useNavigate();
  const { team } = useParams({ strict: false }) as { team: string };
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<NotificationCategoryValue>("all");

  const { data: unread } = useUnreadNotificationCount();
  const { data, isLoading } = useNotificationList({
    category,
    page: 1,
    limit: 20,
  });
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

      <PopoverContent align="end" className="w-[calc(100vw-2rem)] p-0 sm:w-90">
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

        <NotificationCategoryTabs
          active={category}
          onChange={setCategory}
          className="border-b px-3 py-2"
        />

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

        <button
          type="button"
          className="w-full border-t py-2.5 text-center text-sm font-bold text-primary hover:bg-muted"
          onClick={() => {
            setOpen(false);
            navigate({ to: "/$team/notifications", params: { team } });
          }}
        >
          View all notifications
        </button>
      </PopoverContent>
    </Popover>
  );
};
