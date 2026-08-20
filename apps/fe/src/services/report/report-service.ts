import { axiosClient } from "@/lib/axios-client";

export type SavedReport = {
  id: string;
  name: string;
  moduleId: string;
  columnIds: string[];
  filter: Record<string, string>;
  rangeDays: number | null;
  module: { key: string; label: string };
};

export type ReportRun = {
  report: SavedReport;
  columns: { id: string; fieldName: string; fieldType: string }[];
  rows: {
    id: string;
    recordName: string;
    createdAt: string;
    values: Record<string, string | null>;
  }[];
};

export type SaveReportInput = {
  name: string;
  moduleId: string;
  columnIds: string[];
  filter: Record<string, string>;
  rangeDays: number | null;
};

export const getReports = async () => {
  const response = await axiosClient.get(`/api/report`);

  return response.data as SavedReport[];
};

export const runReport = async (id: string) => {
  const response = await axiosClient.get(`/api/report/${id}/run`);

  return response.data as ReportRun;
};

export const createReport = async (input: SaveReportInput) => {
  const response = await axiosClient.post(`/api/report`, input);

  return response.data as SavedReport;
};

export const deleteReport = async (id: string) => {
  const response = await axiosClient.delete(`/api/report/${id}`);

  return response.data;
};
