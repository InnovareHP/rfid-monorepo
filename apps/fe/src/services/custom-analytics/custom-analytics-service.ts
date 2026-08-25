import { axiosClient } from "@/lib/axios-client";

export type CustomAnalyticChartType = "BAR" | "LINE" | "PIE" | "KPI" | "TABLE";
export type CustomAnalyticAggregation =
  | "SUM"
  | "AVG"
  | "COUNT"
  | "MIN"
  | "MAX";
export type CustomAnalyticDimensionType = "FIELD" | "OWNER" | "DATE";
export type CustomAnalyticDateBucket = "DAY" | "WEEK" | "MONTH";

export type CustomAnalytic = {
  id: string;
  name: string;
  moduleId: string;
  chartType: CustomAnalyticChartType;
  metricFieldId: string | null;
  metricAggregation: CustomAnalyticAggregation;
  dimensionType: CustomAnalyticDimensionType;
  dimensionFieldId: string | null;
  dateBucket: CustomAnalyticDateBucket | null;
  columnIds: string[];
  filter: Record<string, string>;
  rangeDays: number | null;
  module: { key: string; label: string };
};

export type CustomAnalyticInput = {
  moduleId: string;
  chartType: CustomAnalyticChartType;
  metricFieldId: string | null;
  metricAggregation: CustomAnalyticAggregation;
  dimensionType: CustomAnalyticDimensionType;
  dimensionFieldId: string | null;
  dateBucket: CustomAnalyticDateBucket;
  columnIds: string[];
  filter: Record<string, string>;
  rangeDays: number | null;
};

export type SaveCustomAnalyticInput = CustomAnalyticInput & { name: string };
export type UpdateCustomAnalyticInput = Partial<SaveCustomAnalyticInput>;

export type CustomAnalyticResult =
  | { chartType: "BAR" | "PIE"; data: { name: string; value: number }[] }
  | { chartType: "LINE"; data: { bucket: string; value: number }[] }
  | { chartType: "KPI"; value: number }
  | {
      chartType: "TABLE";
      columns: { id: string; fieldName: string; fieldType: string }[];
      rows: {
        id: string;
        recordName: string;
        createdAt: string;
        values: Record<string, string | null>;
      }[];
    };

export const getCustomAnalytics = async () => {
  const response = await axiosClient.get(`/api/custom-analytics`);

  return response.data as CustomAnalytic[];
};

export const runCustomAnalytic = async (
  id: string,
  dateWindow?: { start: Date; end: Date } | null
) => {
  const response = await axiosClient.get(`/api/custom-analytics/${id}/run`, {
    ...(dateWindow && {
      params: {
        startDate: dateWindow.start.toISOString(),
        endDate: dateWindow.end.toISOString(),
      },
    }),
  });

  return response.data as CustomAnalyticResult;
};

export const previewCustomAnalytic = async (input: CustomAnalyticInput) => {
  const response = await axiosClient.post(
    `/api/custom-analytics/preview`,
    input
  );

  return response.data as CustomAnalyticResult;
};

export const createCustomAnalytic = async (input: SaveCustomAnalyticInput) => {
  const response = await axiosClient.post(`/api/custom-analytics`, input);

  return response.data as CustomAnalytic;
};

export const updateCustomAnalytic = async (
  id: string,
  input: UpdateCustomAnalyticInput
) => {
  const response = await axiosClient.patch(
    `/api/custom-analytics/${id}`,
    input
  );

  return response.data as CustomAnalytic;
};

export const deleteCustomAnalytic = async (id: string) => {
  const response = await axiosClient.delete(`/api/custom-analytics/${id}`);

  return response.data;
};
