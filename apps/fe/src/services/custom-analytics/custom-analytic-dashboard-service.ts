import { axiosClient } from "@/lib/axios-client";
import { downloadPdf } from "@/lib/helper/download-pdf";
import type {
  CustomAnalyticChartType,
  CustomAnalyticResult,
  CustomAnalyticTileSpan,
} from "./custom-analytics-service";

export type CustomAnalyticDashboard = {
  id: string;
  name: string;
  // A seeded module page: it opens through the module's analytics route rather
  // than the generic dashboard view.
  moduleId: string | null;
  isDefault: boolean;
  analytics: {
    id: string;
    name: string;
    chartType: CustomAnalyticChartType;
    tileSpan: CustomAnalyticTileSpan;
  }[];
};

export type CustomAnalyticDashboardDetail = {
  id: string;
  name: string;
  // A seeded module page: fixed name and membership, editable charts.
  isDefault: boolean;
  // Set when the dashboard belongs to one module, which locks a new chart to it.
  moduleId: string | null;
  analytics: {
    id: string;
    name: string;
    moduleId: string;
    module: { key: string; label: string };
  }[];
};

// Charts join a dashboard from inside it, so creating one only needs a name.
export type SaveDashboardInput = { name: string; analyticIds?: string[] };
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
    tileSpan: CustomAnalyticTileSpan;
    // The chart's own module, so a tile can link to its editor.
    moduleKey: string;
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

// The module's seeded analytics page. Resolved by module key, not id, so the
// caller only needs what the route already carries.
export const getDefaultDashboard = async (moduleKey: string) => {
  const response = await axiosClient.get(
    `/api/custom-analytics/dashboards/default`,
    { params: { moduleKey } }
  );

  return response.data as CustomAnalyticDashboardDetail;
};

export type DashboardInsights = {
  executive_summary?: string;
  key_insights?: string[];
  bottlenecks?: string[];
  opportunities?: string[];
  recommended_strategy?: { short_term?: string[]; long_term?: string[] };
  final_recommendations?: string;
};

// Generated from the dashboard's own chart results, so any module gets one.
export const getDashboardInsights = async (
  id: string,
  dateWindow?: { start: Date; end: Date } | null,
  force = false
) => {
  const response = await axiosClient.post(
    `/api/custom-analytics/dashboards/${id}/insights`,
    {},
    {
      params: {
        ...(dateWindow
          ? {
              startDate: dateWindow.start.toISOString(),
              endDate: dateWindow.end.toISOString(),
            }
          : {}),
        ...(force ? { force: "true" } : {}),
      },
    }
  );

  return response.data as DashboardInsights;
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

// Charts print as the numbers behind them, so the document reads the same data
// the dashboard just rendered.
export const downloadDashboardPdf = async (
  id: string,
  dateWindow?: { start: Date; end: Date } | null
) =>
  await downloadPdf(
    `/api/custom-analytics/dashboards/${id}/pdf`,
    dateWindow
      ? {
          startDate: dateWindow.start.toISOString(),
          endDate: dateWindow.end.toISOString(),
        }
      : {},
    "dashboard"
  );

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
