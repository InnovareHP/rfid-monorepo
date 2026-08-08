import { PageHeader } from "@/components/page-header";
import {
  useNotificationList,
  useNotificationMutations,
  useNotificationStats,
} from "@/hooks/use-notifications";
import type {
  NotificationCategoryValue,
  NotificationDto,
} from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useState } from "react";
import { KpiStatTile } from "../analytics/charts/kpi-stat-tile";
import { groupByDay } from "./group-by-day";
import { NotificationCategoryTabs } from "./notification-category-tabs";
import { NotificationRow } from "./notification-row";

export const NotificationsPage = () => {
  const navigate = useNavigate();

  const [category, setCategory] = useState<NotificationCategoryValue>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useNotificationList({
    category,
    search,
    page,
    limit,
  });
  const { data: stats, isLoading: statsLoading } = useNotificationStats();
  const { markReadMutation, markAllReadMutation, deleteMutation } =
    useNotificationMutations();

  const notifications = data?.data ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / limit));
  const groups = groupByDay(notifications);

  const handleSelect = (notification: NotificationDto) => {
    if (!notification.readAt) markReadMutation.mutate([notification.id]);
    if (notification.link) navigate({ to: notification.link });
  };

  return (
    <div className="page-style">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Notifications"
          description="Everything happening across your workspace, in one place."
        />

        <Button
          variant="outline"
          size="sm"
          disabled={markAllReadMutation.isPending || !stats?.unread}
          onClick={() => markAllReadMutation.mutate()}
        >
          <Check className="size-4" />
          Mark All as Read
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiStatTile
          label="Total Notifications"
          value={(stats?.total ?? 0).toLocaleString()}
          isLoading={statsLoading}
        />
        <KpiStatTile
          label="Unread"
          value={(stats?.unread ?? 0).toLocaleString()}
          isLoading={statsLoading}
        />
        <KpiStatTile
          label="This Week"
          value={(stats?.thisWeek ?? 0).toLocaleString()}
          isLoading={statsLoading}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          placeholder="Search notifications...."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="w-full bg-background lg:max-w-lg"
        />
        <NotificationCategoryTabs
          active={category}
          onChange={(next) => {
            setCategory(next);
            setPage(1);
          }}
        />
      </div>

      <div className="overflow-hidden rounded-md border">
        {isLoading ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : groups.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted-foreground">
            {search ? "No notifications match that search." : "Nothing here yet."}
          </p>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <p className="border-b bg-table-header px-4 py-2 text-sm font-semibold text-foreground">
                {group.label}
              </p>
              {group.items.map((notification) => (
                <NotificationRow
                  key={notification.id}
                  notification={notification}
                  onSelect={handleSelect}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
              ))}
            </div>
          ))
        )}

        <div className="flex flex-wrap items-center justify-end gap-6 border-t px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-sm text-muted-foreground">
            Page {page} of {lastPage}
          </span>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="First page"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={page >= lastPage}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Last page"
              disabled={page >= lastPage}
              onClick={() => setPage(lastPage)}
            >
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
