import { axiosClient } from "@/lib/axios-client";
import type {
  ReferralHistoryItem,
  ReferralHistoryResponse,
} from "@dashboard/shared";

export const getReferral = async (filterMeta: any) => {
  const response = await axiosClient.get("/api/boards", {
    params: {
      ...filterMeta,
      filter: JSON.stringify(filterMeta.filter),
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
  const response = await axiosClient.get("/api/boards/column", {
    params: { moduleType: "REFERRAL" },
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

