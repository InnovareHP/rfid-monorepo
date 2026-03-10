import { axiosClient } from "@/lib/axios-client";
import type { AnalyticsResponse } from "@dashboard/shared";

export const getAnalytics = async (
  start: string | null,
  end: string | null
) => {
  const response = await axiosClient.get(`/api/analytics`, {
    params: {
      start,
      end,
    },
  });

  return response.data;
};

export const getAnalyticsSummary = async (analytics: AnalyticsResponse) => {
  const response = await axiosClient.get(`/api/analytics/summary`, {
    params: {
      analytics,
    },
  });

  return response.data;
};

export const getMarketingList = async (
  start: Date | null,
  end: Date | null,
  userId: string | null
) => {
  const response = await axiosClient.get(`/api/analytics/marketing`, {
    params: {
      start,
      end,
      userId,
    },
  });

  return response.data;
};
