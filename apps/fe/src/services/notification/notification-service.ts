import { axiosClient } from "@/lib/axios-client";
import type {
  NotificationDto,
  NotificationListQuery,
  NotificationStatsDto,
  PaginatedResponse,
  UnreadCountDto,
} from "@dashboard/shared";

export const getNotifications = async (query: NotificationListQuery) => {
  const response = await axiosClient.get("/api/notification", {
    params: {
      unreadOnly: query.unreadOnly,
      category: query.category ?? "all",
      search: query.search || undefined,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    },
  });
  return response.data as PaginatedResponse<NotificationDto>;
};

export const getNotificationStats = async () => {
  const response = await axiosClient.get("/api/notification/stats");
  return response.data as NotificationStatsDto;
};

export const getUnreadNotificationCount = async () => {
  const response = await axiosClient.get("/api/notification/unread-count");
  return response.data as UnreadCountDto;
};

export const markNotificationsRead = async (ids: string[]) => {
  const response = await axiosClient.patch("/api/notification/read", { ids });
  return response.data as { updated: number };
};

export const markAllNotificationsRead = async () => {
  const response = await axiosClient.patch("/api/notification/read-all");
  return response.data as { updated: number };
};

export const deleteNotification = async (id: string) => {
  const response = await axiosClient.delete(`/api/notification/${id}`);
  return response.data as { deleted: number };
};

export const clearReadNotifications = async () => {
  const response = await axiosClient.delete("/api/notification/read");
  return response.data as { deleted: number };
};
