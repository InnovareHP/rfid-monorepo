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

export const getModuleColumns = async (moduleType: CrmModuleType) => {
  const response = await axiosClient.get("/api/boards/column", {
    params: { moduleType },
  });

  return response.data;
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

export const updateModuleRecord = async (
  moduleType: CrmModuleType,
  recordId: string,
  fieldId: string,
  value: string,
  previousValue?: string
) => {
  const response = await axiosClient.patch(`/api/boards/${recordId}`, {
    value,
    fieldId,
    moduleType,
    previousValue,
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

export const getModuleDropdownOptions = async (fieldKey: string) => {
  const response = await axiosClient.get(
    `/api/boards/field/${fieldKey}/options`
  );

  return response.data;
};

export type DuplicateMatch = {
  recordId: string;
  recordName: string;
  matchedField: string;
  matchedValue: string;
};

export const findModuleDuplicates = async (
  moduleType: CrmModuleType,
  params: { email?: string; phone?: string; excludeRecordId?: string }
) => {
  const response = await axiosClient.get("/api/boards/duplicates", {
    params: { ...params, moduleType },
  });

  return response.data as { duplicates: DuplicateMatch[] };
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

export const getLinkCandidates = async (
  targetModule: string,
  page = 1,
  limit = 500
) => {
  const response = await axiosClient.get("/api/boards/records", {
    params: { moduleType: targetModule, page, limit },
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
