import { axiosClient } from "@/lib/axios-client";
import type { OptionsResponse } from "@dashboard/shared";

export const getOptionsCounties = async () => {
  const response = await axiosClient.get(`/api/options/counties`);

  return response.data as OptionsResponse[];
};

export const getLiaisons = async (isLiaison: boolean) => {
  const response = await axiosClient.get(`/api/options/members`, {
    params: {
      isLiaison,
    },
  });

  return response.data as OptionsResponse[];
};

export const deleteDropdownOption = async (optionId: string) => {
  const response = await axiosClient.delete(
    `/api/leads/field/options/${optionId}`
  );

  return response.data;
};
