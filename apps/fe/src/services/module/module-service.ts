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

export type CreateModuleInput = {
  label: string;
  labelSingular: string;
  icon?: string;
  fields: { fieldName: string; fieldType: string; options?: string[] }[];
};

export const createModule = async (input: CreateModuleInput) => {
  const response = await axiosClient.post(`/api/module`, input);

  return response.data as Pick<
    CrmModule,
    "id" | "key" | "label" | "labelSingular"
  >;
};
