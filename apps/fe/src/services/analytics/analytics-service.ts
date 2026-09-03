import { axiosClient } from "@/lib/axios-client";
import type {
  AnalyticsResponse,
  MarketingAnalyticsResponse,
  MasterListAnalyticsResponse,
} from "@dashboard/shared";

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

export const getAnalyticsSummary = async (
  analytics: AnalyticsResponse,
  start: string | null,
  end: string | null,
  force = false
) => {
  const response = await axiosClient.post(
    `/api/analytics/summary`,
    { analytics },
    {
      params: {
        start,
        end,
        ...(force ? { force: true } : {}),
      },
    }
  );

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

  return response.data as MarketingAnalyticsResponse;
};

export const getMasterListAnalytics = async (
  start: string | null,
  end: string | null
) => {
  const response = await axiosClient.get(`/api/analytics/master-list`, {
    params: { start, end },
  });

  return response.data as MasterListAnalyticsResponse;
};

export const getMasterListSummary = async (
  analytics: MasterListAnalyticsResponse,
  start: string | null,
  end: string | null,
  force = false
) => {
  const response = await axiosClient.post(
    `/api/analytics/master-list/summary`,
    { analytics },
    {
      params: {
        start,
        end,
        ...(force ? { force: true } : {}),
      },
    }
  );

  return response.data;
};
