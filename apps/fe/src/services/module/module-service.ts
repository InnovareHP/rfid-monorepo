import { axiosClient } from "@/lib/axios-client";

export type CrmModule = {
  id: string;
  key: string;
  label: string;
  labelSingular: string;
  icon: string | null;
  isSystem: boolean;
  isArchived: boolean;
  moduleOrder: number;
};

export const getModules = async () => {
  const response = await axiosClient.get(`/api/module`);

  return response.data as CrmModule[];
};
