import { axiosClient } from "@/lib/axios-client";
import type {
  CountyRow,
  ReferralHistoryItem,
  ReferralHistoryResponse,
  ReferralResponse,
} from "@/lib/types";

export const getReferral = async (filterMeta: any) => {
  const response = await axiosClient.get("/api/referral", {
    params: {
      ...filterMeta,
    },
  });

  if (response.status !== 200) {
    throw new Error("Failed to fetch referrals");
  }

  return response.data;
};

export const getSpecificReferral = async (referralId: string) => {
  const response = await axiosClient.get(`/api/referral/${referralId}`);

  if (response.status !== 200) {
    throw new Error("Failed to fetch specific referral");
  }

  return response.data as ReferralResponse;
};

export const getReferralHistory = async (
  referralId: string,
  take: number,
  skip: number
) => {
  const response = await axiosClient.get(
    `/api/referral/timeline/${referralId}?take=${take}&skip=${skip}`
  );

  if (response.status !== 200) {
    throw new Error("Failed to fetch referral history");
  }

  return response.data as ReferralHistoryResponse;
};

export const getReferralColumnOptions = async () => {
  const response = await axiosClient.get("/api/referral/columns");

  if (response.status !== 200) {
    throw new Error("Failed to fetch referrals columns");
  }

  return response.data;
};

export const getReferralDropdownOptions = async (
  fieldKey: string,
  page?: number,
  limit?: number
) => {
  const response = await axiosClient.get(
    `/api/referral/field/${fieldKey}/options?page=${page}&limit=${limit}`
  );

  if (response.status !== 200) {
    throw new Error("Failed to fetch referrals dropdown options");
  }

  return response.data as any;
};

export const createReferralDropdownOption = async (
  fieldKey: string,
  option: string
) => {
  const response = await axiosClient.post(
    `/api/referral/field/${fieldKey}/options`,
    {
      option_name: option,
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
  const response = await axiosClient.patch(`/api/referral/${referralId}`, {
    value,
    fieldId,
    reason,
  });

  if (response.status !== 200) {
    throw new Error("Failed to update referral");
  }

  return response.data;
};

export const createReferral = async (data: any) => {
  const response = await axiosClient.post("/api/referral", {
    data,
  });

  return response.data;
};

export const createReferralColumn = async (
  referral_type: string,
  column_name: string
) => {
  const response = await axiosClient.post("/api/referral/column", {
    referral_type,
    column_name,
  });

  return response.data;
};

export const deleteReferralColumn = async (columnIds: string[]) => {
  const response = await axiosClient.delete(`/api/referral`, {
    data: {
      column_ids: columnIds,
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
    `/api/referral/timeline/${referralId}?take=${take}&skip=${skip}`
  );

  if (response.status !== 200) {
    throw new Error("Failed to fetch referral timeline");
  }

  return response.data;
};

export const createReferralTimeline = async (
  referralId: string,
  data: ReferralHistoryItem
) => {
  const response = await axiosClient.post(
    `/api/referral/timeline/${referralId}`,
    {
      ...data,
    }
  );

  return response.data;
};

export const editReferralTimeline = async (id: string) => {
  const response = await axiosClient.patch(`/api/referral/timeline/${id}`);

  if (response.status !== 200) {
    throw new Error("Failed to edit referral timeline");
  }

  return response.data;
};

export const deleteReferralTimeline = async (id: string) => {
  const response = await axiosClient.delete(`/api/referral/timeline/${id}`);

  if (response.status !== 200) {
    throw new Error("Failed to delete referral timeline");
  }

  return response.data;
};

export const getCounties = async () => {
  const response = await axiosClient.get("/api/referral/county/configuration");

  if (response.status !== 200) {
    throw new Error("Failed to fetch referral counties");
  }

  return response.data;
};

export const createCounty = async (data: CountyRow) => {
  const response = await axiosClient.post("/api/referral/county/assignment", {
    ...data,
  });

  return response.data;
};

export const deleteCounty = async (id: string) => {
  const response = await axiosClient.delete(
    `/api/referral/county/assignment/${id}`
  );

  if (response.status !== 200) {
    throw new Error("Failed to delete county");
  }

  return response.data;
};

export const deleteReferral = async (columnIds: string[]) => {
  const response = await axiosClient.delete("/api/referral", {
    data: {
      column_ids: columnIds,
    },
  });

  return response.data;
};

export const seenReferrals = async (referralId: string) => {
  const response = await axiosClient.post("/api/referral/notification-state", {
    referral_id: referralId,
  });

  if (response.status !== 200) {
    throw new Error("Failed to seen referrals");
  }

  return response.data;
};

export const deleteReferralDropdownOption = async (optionId: string) => {
  const response = await axiosClient.delete(
    `/api/referral/field/options/${optionId}`
  );

  if (response.status !== 200) {
    throw new Error("Failed to delete referral dropdown option");
  }

  return response.data;
};
