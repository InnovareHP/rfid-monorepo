import { axiosClient } from "@/lib/axios-client";
import { requestCsv } from "@/lib/helper/csv-download";
import type { MarketingReportResponse } from "@dashboard/shared";

type MarketLogsResponse = MarketingReportResponse & {
  columns: { id: string; name: string; type: string }[];
};

export const getMarketLogs = async (
  filters?: any
): Promise<MarketLogsResponse> => {
  const response = await axiosClient.get("/api/liaison/marketing", {
    params: {
      ...filters,
      filter: filters?.filter ? JSON.stringify(filters.filter) : undefined,
    },
  });

  // Return response data directly - API should handle pagination and return { data, columns, nextPage }
  // If API doesn't return columns, provide empty array for compatibility
  const data = response.data;

  return {
    ...data,
    columns: data.columns || [],
  };
};

// Server assembles the csv so the export lands as one audited event rather
// than as a burst of page reads.
export const exportMarketingCsv = async (range: {
  from?: string;
  to?: string;
}) =>
  requestCsv("/api/liaison/marketing/export", range, "marketing-report.csv");

export const createMarketLog = async (data: any) => {
  const response = await axiosClient.post("/api/liaison/marketing", {
    ...data,
  });

  return response.data;
};

export const updateMarketLog = async (id: string, data: any) => {
  const response = await axiosClient.patch(`/api/liaison/marketing/${id}`, {
    ...data,
  });

  return response.data;
};

export const deleteMarketLog = async (id: string) => {
  const response = await axiosClient.delete(`/api/liaison/marketing/${id}`);

  return response.data;
};

export const getFacilityOptions = async () => {
  const response = await axiosClient.get(`/api/options/facility`);

  return response.data;
};
