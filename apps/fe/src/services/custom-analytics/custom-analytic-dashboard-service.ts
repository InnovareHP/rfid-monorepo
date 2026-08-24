import { axiosClient } from "@/lib/axios-client";
import type {
  CustomAnalyticChartType,
  CustomAnalyticResult,
} from "./custom-analytics-service";

export type CustomAnalyticDashboard = {
  id: string;
  name: string;
  analytics: { id: string; name: string; chartType: CustomAnalyticChartType }[];
};

export type CustomAnalyticDashboardDetail = {
  id: string;
  name: string;
  analytics: {
    id: string;
    name: string;
    moduleId: string;
    module: { key: string; label: string };
  }[];
};

export type SaveDashboardInput = { name: string; analyticIds: string[] };
export type UpdateDashboardInput = Partial<SaveDashboardInput>;

export type CustomAnalyticDashboardRun = {
  id: string;
  name: string;
  // Total membership; `charts` may be shorter when `limit` was sent.
  chartCount: number;
  charts: {
    id: string;
    name: string;
    chartType: CustomAnalyticChartType;
    result: CustomAnalyticResult;
  }[];
};

export const getDashboards = async () => {
  const response = await axiosClient.get(`/api/custom-analytics/dashboards`);

  return response.data as CustomAnalyticDashboard[];
};

export const getDashboard = async (id: string) => {
  const response = await axiosClient.get(
    `/api/custom-analytics/dashboards/${id}`
  );

  return response.data as CustomAnalyticDashboardDetail;
};

export const runDashboard = async (
  id: string,
  dateWindow?: { start: Date; end: Date } | null,
  limit?: number
) => {
  const response = await axiosClient.get(
    `/api/custom-analytics/dashboards/${id}/run`,
    {
      params: {
        ...(dateWindow && {
          startDate: dateWindow.start.toISOString(),
          endDate: dateWindow.end.toISOString(),
        }),
        ...(limit !== undefined && { limit }),
      },
    }
  );

  return response.data as CustomAnalyticDashboardRun;
};

export const createDashboard = async (input: SaveDashboardInput) => {
  const response = await axiosClient.post(
    `/api/custom-analytics/dashboards`,
    input
  );

  return response.data as CustomAnalyticDashboard;
};

export const updateDashboard = async (
  id: string,
  input: UpdateDashboardInput
) => {
  const response = await axiosClient.patch(
    `/api/custom-analytics/dashboards/${id}`,
    input
  );

  return response.data as CustomAnalyticDashboard;
};

export const reorderDashboardCharts = async (
  id: string,
  analyticIds: string[]
) => {
  const response = await axiosClient.patch(
    `/api/custom-analytics/dashboards/${id}/reorder`,
    { analyticIds }
  );

  return response.data as { id: string; analyticIds: string[] };
};

export const deleteDashboard = async (id: string) => {
  const response = await axiosClient.delete(
    `/api/custom-analytics/dashboards/${id}`
  );

  return response.data;
};
