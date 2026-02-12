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

  if (response.status !== 200) {
    throw new Error("Failed to fetch analytics");
  }

  return response.data;
};

export const getAnalyticsSummary = async (analytics: AnalyticsResponse) => {
  const response = await axiosClient.get(`/api/analytics/summary`, {
    params: {
      analytics,
    },
  });

  if (response.status !== 200) {
    throw new Error("Failed to fetch analytics summary");
  }

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

  if (response.status !== 200) {
    throw new Error("Failed to fetch marketing list");
  }

  return response.data;
};
