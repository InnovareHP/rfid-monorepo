import {
  clearReadNotifications,
  deleteNotification,
  getNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationsRead,
} from "@/services/notification/notification-service";
import type {
  NotificationDto,
  PaginatedResponse,
  UnreadCountDto,
} from "@dashboard/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const UNREAD_COUNT_KEY = ["notifications-unread-count"];

type NotificationCache = PaginatedResponse<NotificationDto>;

export const useNotifications = (unreadOnly = false, limit = 20) =>
  useQuery({
    queryKey: ["notifications", { unreadOnly, limit }],
    queryFn: () => getNotifications({ unreadOnly, page: 1, limit }),
  });

export const useUnreadNotificationCount = () =>
  useQuery({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: getUnreadNotificationCount,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
  });

export const useNotificationMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
  };

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) => markNotificationsRead(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      const snapshot = queryClient.getQueriesData({
        queryKey: ["notifications"],
      });
      const readAt = new Date().toISOString();

      queryClient.setQueriesData<NotificationCache>(
        { queryKey: ["notifications"] },
        (cache) =>
          cache
            ? {
                ...cache,
                data: cache.data.map((item) =>
                  ids.includes(item.id) && !item.readAt
                    ? { ...item, readAt }
                    : item
                ),
              }
            : cache
      );
      queryClient.setQueryData<UnreadCountDto>(UNREAD_COUNT_KEY, (cache) =>
        cache ? { count: Math.max(0, cache.count - ids.length) } : cache
      );

      return { snapshot };
    },
    onError: (_error, _ids, context) => {
      context?.snapshot.forEach(([key, value]) =>
        queryClient.setQueryData(key, value)
      );
      toast.error("Failed to mark notification as read");
    },
    onSuccess: invalidate,
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      invalidate();
      toast.success("All notifications marked as read");
    },
    onError: () => toast.error("Failed to mark all as read"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: invalidate,
    onError: () => toast.error("Failed to delete notification"),
  });

  const clearReadMutation = useMutation({
    mutationFn: clearReadNotifications,
    onSuccess: () => {
      invalidate();
      toast.success("Read notifications cleared");
    },
    onError: () => toast.error("Failed to clear notifications"),
  });

  return {
    markReadMutation,
    markAllReadMutation,
    deleteMutation,
    clearReadMutation,
  };
};
