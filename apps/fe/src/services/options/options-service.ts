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

export const deleteFieldOption = async (optionId: string) => {
  const response = await axiosClient.delete(
    `/api/boards/field/options/${optionId}`
  );

  return response.data;
};

export const getFieldOptionUsage = async (optionId: string) => {
  const response = await axiosClient.get(
    `/api/boards/field/options/${optionId}/usage`
  );

  return response.data as { count: number };
};

// Field options are keyed by field, not by module, so one pair of calls serves
// every module. Returns unknown: the endpoint answers a bare array when unpaged
// and a page object otherwise, so callers narrow through field-options helpers.
export const getFieldOptions = async (
  fieldKey: string,
  page?: number,
  limit?: number,
  search?: string
): Promise<unknown> => {
  const response = await axiosClient.get(
    `/api/boards/field/${fieldKey}/options`,
    {
      params: {
        page,
        limit,
        search: search || undefined,
      },
    }
  );

  return response.data;
};

export const createFieldOption = async (
  fieldKey: string,
  option: string,
  color?: string
) => {
  const response = await axiosClient.post(
    `/api/boards/field/${fieldKey}/options`,
    {
      optionName: option,
      ...(color && { color }),
    }
  );

  return response.data;
};
