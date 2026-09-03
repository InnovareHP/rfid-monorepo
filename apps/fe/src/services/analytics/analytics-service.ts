import { axiosClient } from "@/lib/axios-client";
import { downloadPdf } from "@/lib/helper/download-pdf";
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

// Rendered server side so the download carries the letterhead and selectable
// text, rather than a screenshot of the page.
export const downloadLiaisonPerformancePdf = async (
  start: Date | null,
  end: Date | null,
  userId: string | null
) =>
  await downloadPdf(
    "/api/analytics/marketing/pdf",
    { start, end, userId },
    "liaison-performance"
  );

export const downloadReferralAnalyticsPdf = async (
  start: string | null,
  end: string | null
) => await downloadPdf("/api/analytics/pdf", { start, end }, "referral-analytics");

export const downloadMasterListAnalyticsPdf = async (
  start: string | null,
  end: string | null
) =>
  await downloadPdf(
    "/api/analytics/master-list/pdf",
    { start, end },
    "master-list-analytics"
  );

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
