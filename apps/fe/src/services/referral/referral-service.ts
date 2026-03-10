import { axiosClient } from "@/lib/axios-client";
import type {
  CountyRow,
  ReferralHistoryItem,
  ReferralHistoryResponse,
} from "@dashboard/shared";

export const getReferral = async (filterMeta: any) => {
  const response = await axiosClient.get("/api/boards", {
    params: {
      ...filterMeta,
      moduleType: "REFERRAL",
    },
  });

  return response.data;
};

export const getSpecificReferral = async (
  referralId: string,
  moduleType?: string
) => {
  const response = await axiosClient.get(
    `/api/boards/${referralId}?moduleType=${moduleType || "REFERRAL"}`
  );

  return response.data;
};

export const getReferralHistory = async (
  referralId: string,
  take: number,
  skip: number
) => {
  const response = await axiosClient.get(
    `/api/boards/timeline/${referralId}?take=${take}&skip=${skip}&moduleType=REFERRAL`
  );

  return response.data as ReferralHistoryResponse;
};

export const getReferralColumnOptions = async () => {
  const response = await axiosClient.get("/api/boards/columns", {
    params: { moduleType: "REFERRAL" },
  });

  return response.data;
};

export const getReferralDropdownOptions = async (
  fieldKey: string,
  page?: number,
  limit?: number
) => {
  const response = await axiosClient.get(
    `/api/boards/field/${fieldKey}/options`,
    {
      params: {
        page: page,
        limit: limit,
      },
    }
  );

  return response.data as any;
};

export const createReferralDropdownOption = async (
  fieldKey: string,
  option: string
) => {
  const response = await axiosClient.post(
    `/api/boards/field/${fieldKey}/options`,
    {
      optionName: option,
    }
  );

  return response.data;
};

export const updateReferral = async (
  referralId: string,
  fieldId: string,
  value: string,
  reason: string | undefined
) => {
  const response = await axiosClient.patch(`/api/boards/${referralId}`, {
    value,
    fieldId,
    reason,
    moduleType: "REFERRAL",
  });

  return response.data;
};

export const createReferral = async (data: any) => {
  const response = await axiosClient.post("/api/boards", {
    data,
    moduleType: "REFERRAL",
  });

  return response.data;
};

export const createReferralColumn = async (
  fieldType: string,
  columnName: string
) => {
  const response = await axiosClient.post("/api/boards/column", {
    fieldType,
    column_name: columnName,
    moduleType: "REFERRAL",
  });

  return response.data;
};

export const deleteReferralColumn = async (columnIds: string[]) => {
  const response = await axiosClient.delete(`/api/boards`, {
    data: {
      column_ids: columnIds,
      moduleType: "REFERRAL",
    },
  });

  return response.data;
};

export const getReferralTimeline = async (
  referralId: string,
  take: number,
  skip: number
) => {
  const response = await axiosClient.get(
    `/api/boards/timeline/${referralId}?take=${take}&skip=${skip}&moduleType=REFERRAL`
  );

  return response.data;
};

export const createReferralTimeline = async (
  referralId: string,
  data: ReferralHistoryItem
) => {
  const response = await axiosClient.post(
    `/api/boards/timeline/${referralId}`,
    {
      ...data,
      moduleType: "REFERRAL",
    }
  );

  return response.data;
};

export const editReferralTimeline = async (id: string) => {
  const response = await axiosClient.patch(`/api/boards/timeline/${id}`, {
    moduleType: "REFERRAL",
  });

  return response.data;
};

export const deleteReferralTimeline = async (id: string) => {
  const response = await axiosClient.delete(`/api/boards/timeline/${id}`, {
    data: { moduleType: "REFERRAL" },
  });

  return response.data;
};

export const getCounties = async () => {
  const response = await axiosClient.get("/api/boards/county/configuration");

  return response.data;
};

export const createCounty = async (data: CountyRow) => {
  const response = await axiosClient.post("/api/boards/county/assignment", {
    ...data,
  });

  return response.data;
};

export const deleteCounty = async (id: string) => {
  const response = await axiosClient.delete(
    `/api/boards/county/assignment/${id}`
  );

  return response.data;
};

export const deleteReferral = async (columnIds: string[]) => {
  const response = await axiosClient.delete("/api/boards", {
    data: {
      column_ids: columnIds,
      moduleType: "REFERRAL",
    },
  });

  return response.data;
};

export const seenReferrals = async (referralId: string) => {
  const response = await axiosClient.post("/api/boards/notification-state", {
    recordId: referralId,
  });

  return response.data;
};

export const deleteReferralDropdownOption = async (optionId: string) => {
  const response = await axiosClient.delete(
    `/api/boards/field/options/${optionId}`
  );

  return response.data;
};
