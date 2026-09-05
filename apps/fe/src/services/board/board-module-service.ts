import { axiosClient } from "@/lib/axios-client";

// A module key is free text once organizations create their own.
export type CrmModuleType = string;

export const getModuleRecords = async (
  moduleType: CrmModuleType,
  filterMeta: Record<string, unknown>
) => {
  const response = await axiosClient.get("/api/boards", {
    params: { ...filterMeta, moduleType },
  });

  return response.data;
};

export type ModuleColumn = { id: string; name: string; type: string };

export const getModuleColumns = async (moduleType: CrmModuleType) => {
  const response = await axiosClient.get("/api/boards/column", {
    params: { moduleType },
  });

  return response.data as ModuleColumn[];
};

export const createModuleRecords = async (
  moduleType: CrmModuleType,
  data: Record<string, string>[]
) => {
  const response = await axiosClient.post("/api/boards", {
    data,
    moduleType,
  });

  return response.data;
};

// No previousValue: the service reads the prior value off the row it updates,
// since a client-supplied one can be stale or forged.
export const updateModuleRecord = async (
  moduleType: CrmModuleType,
  recordId: string,
  fieldId: string,
  value: string,
  reason?: string
) => {
  const response = await axiosClient.patch(`/api/boards/${recordId}`, {
    value,
    fieldId,
    moduleType,
    reason,
    // A status change stamps Action Date, and the server runs in UTC.
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return response.data;
};

export const deleteModuleRecords = async (
  moduleType: CrmModuleType,
  recordIds: string[]
) => {
  const response = await axiosClient.delete("/api/boards", {
    data: {
      column_ids: recordIds,
      moduleType,
    },
  });

  return response.data;
};

export const getModuleDropdownOptions = async (
  fieldKey: string,
  search?: string,
  limit?: number
) => {
  const response = await axiosClient.get(
    `/api/boards/field/${fieldKey}/options`,
    {
      params: {
        page: limit ? 1 : undefined,
        limit,
        search: search || undefined,
      },
    }
  );

  return response.data;
};

export type DuplicateMatch = {
  recordId: string;
  recordName: string;
  matchedField: string;
  matchedValue: string;
};

export type NameMatch = {
  recordId: string;
  recordName: string;
};

// exactMatch means the create will be refused server side; nearMatches only
// look like the same record and are advisory.
export type DuplicateCheck = {
  duplicates: DuplicateMatch[];
  exactMatch: NameMatch | null;
  nearMatches: NameMatch[];
};

export const findModuleDuplicates = async (
  moduleType: CrmModuleType,
  params: {
    email?: string;
    phone?: string;
    recordName?: string;
    excludeRecordId?: string;
  }
) => {
  const response = await axiosClient.get("/api/boards/duplicates", {
    params: { ...params, moduleType },
  });

  return response.data as DuplicateCheck;
};

export type RelatedRecord = {
  id: string;
  recordName: string;
  moduleType: string;
  relationType: string;
};

export const getRelatedRecords = async (recordId: string) => {
  const response = await axiosClient.get(`/api/boards/${recordId}/related`);
  return response.data as RelatedRecord[];
};

export type RecordLinkCounts = {
  total: number;
  byModule: Record<string, number>;
};

export const getRecordLinkCounts = async (recordIds: string[]) => {
  const response = await axiosClient.post("/api/boards/link-counts", {
    recordIds,
  });
  return response.data as RecordLinkCounts;
};

export const getLinkCandidates = async (
  targetModule: string,
  page = 1,
  limit = 500,
  search?: string
) => {
  const response = await axiosClient.get("/api/boards/records", {
    params: { moduleType: targetModule, page, limit, search: search || undefined },
  });

  return response.data;
};

export const createModuleColumn = async (
  moduleType: CrmModuleType,
  fieldType: string,
  columnName: string
) => {
  const response = await axiosClient.post("/api/boards/column", {
    fieldType,
    column_name: columnName,
    moduleType,
  });

  return response.data;
};
