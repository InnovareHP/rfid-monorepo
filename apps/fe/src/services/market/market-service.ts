import { axiosClient } from "@/lib/axios-client";
import { requestCsv } from "@/lib/helper/csv-download";
import type {
  AccountManagerRow,
  MarketingLogRow,
} from "@/lib/helper/marketing-import";
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

export const bulkDeleteMarketLogs = async (ids: string[]) => {
  const response = await axiosClient.post(
    "/api/liaison/marketing/bulk-delete",
    { ids }
  );

  return response.data;
};

type ImportBatch<T> = { dryRun: boolean; firstRow: number; rows: T[] };

type RowIssue = { row: number; value: string };

export type MarketingImportResult = {
  created: number;
  duplicates: number;
  missing: RowIssue[];
  ids: string[];
};

export type AccountManagerImportResult = {
  assigned: number;
  alreadySet: number;
  missing: RowIssue[];
  unknownManagers: RowIssue[];
};

export const importMarketLogs = async (batch: ImportBatch<MarketingLogRow>) => {
  const response = await axiosClient.post(
    "/api/liaison/marketing/import",
    batch
  );

  return response.data as MarketingImportResult;
};

export const importAccountManagers = async (
  batch: ImportBatch<AccountManagerRow>
) => {
  const response = await axiosClient.post(
    "/api/liaison/marketing/import/account-managers",
    batch
  );

  return response.data as AccountManagerImportResult;
};

export const undoMarketLogImport = async (ids: string[]) => {
  const response = await axiosClient.post(
    "/api/liaison/marketing/import/undo",
    { ids }
  );

  return response.data as { removed: number };
};

export const getFacilityOptions = async () => {
  const response = await axiosClient.get(`/api/options/facility`);

  return response.data;
};
