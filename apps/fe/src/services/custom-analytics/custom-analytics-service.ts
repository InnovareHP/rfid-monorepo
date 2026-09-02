import { axiosClient } from "@/lib/axios-client";

export type CustomAnalyticChartType =
  | "BAR"
  | "LINE"
  | "PIE"
  | "KPI"
  | "TABLE"
  | "MAP";

// Tile width on a dashboard, over a six-column grid.
export type CustomAnalyticTileSpan = "THIRD" | "HALF" | "TWO_THIRDS" | "FULL";
export type CustomAnalyticAggregation =
  | "SUM"
  | "AVG"
  | "COUNT"
  | "MIN"
  | "MAX"
  | "PERCENT";
export type CustomAnalyticDimensionType =
  | "FIELD"
  | "OWNER"
  | "DATE"
  | "RELATED_RECORD";
export type CustomAnalyticRelationType =
  | "REFERRAL_LINK"
  | "FACILITY_LINK"
  | "CONTACT_LINK"
  | "COMPANY_LINK";
export type CustomAnalyticDateBucket = "DAY" | "WEEK" | "MONTH";

export type AnalyticFilterInput = {
  match: "AND" | "OR";
  conditions: { fieldId: string; operator: string; value: string }[];
};

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
  filter: AnalyticFilterInput;
  rangeDays: number | null;
  groupLimit: number | null;
  numeratorFilter: AnalyticFilterInput | null;
  minGroupSize: number | null;
  maxGroupSize: number | null;
  relationType: CustomAnalyticRelationType | null;
  relationDirection: "OUTGOING" | "INCOMING";
  relatedFieldId: string | null;
  metricSource: "FIELD_VALUE" | "DAYS_TO_CHANGE" | "MARKETING_ACTIVITY";
  marketingMeasure: "INTERACTIONS" | "FACILITIES" | "PEOPLE";
  marketingGroupBy: "LIAISON" | "FACILITY" | "TOUCHPOINT" | null;
  durationFieldId: string | null;
  tileSpan: CustomAnalyticTileSpan;
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
  filter: AnalyticFilterInput;
  rangeDays: number | null;
  groupLimit: number | null;
  numeratorFilter: AnalyticFilterInput;
  minGroupSize: number | null;
  maxGroupSize: number | null;
  relationType: CustomAnalyticRelationType | null;
  relationDirection: "OUTGOING" | "INCOMING";
  relatedFieldId: string | null;
  metricSource: "FIELD_VALUE" | "DAYS_TO_CHANGE" | "MARKETING_ACTIVITY";
  marketingMeasure: "INTERACTIONS" | "FACILITIES" | "PEOPLE";
  marketingGroupBy: "LIAISON" | "FACILITY" | "TOUCHPOINT" | null;
  durationFieldId: string | null;
  tileSpan: CustomAnalyticTileSpan;
};

// dashboardId is create-only: the API attaches the new chart in the same write.
export type SaveCustomAnalyticInput = CustomAnalyticInput & {
  name: string;
  dashboardId?: string | null;
};
export type UpdateCustomAnalyticInput = Partial<SaveCustomAnalyticInput>;

export type CustomAnalyticResult =
  | {
      chartType: "BAR" | "PIE" | "MAP";
      data: { name: string; value: number; color?: string }[];
    }
  | { chartType: "LINE"; data: { bucket: string; value: number }[] }
  | {
      chartType: "KPI";
      value: number;
      unit?: "percent";
      series: { bucket: string; value: number }[];
    }
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

// moduleKey narrows the list to one module's charts for that module's page.
export const getCustomAnalytics = async (
  moduleKey?: string,
  unfiled = false
) => {
  const response = await axiosClient.get(`/api/custom-analytics`, {
    params: {
      ...(moduleKey ? { moduleKey } : {}),
      ...(unfiled ? { unfiled: "true" } : {}),
    },
  });

  return response.data as CustomAnalytic[];
};

export const getCustomAnalytic = async (id: string) => {
  const response = await axiosClient.get(`/api/custom-analytics/${id}`);

  return response.data as CustomAnalytic;
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
