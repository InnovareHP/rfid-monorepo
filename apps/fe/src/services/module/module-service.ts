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
  // Sidebar folder only. Null means the module sits at the top level; the name
  // rides along so a picker can label the folder without joining the groups.
  groupId: string | null;
  groupName: string | null;
};

export const getModules = async () => {
  const response = await axiosClient.get(`/api/module`);

  return response.data as CrmModule[];
};

export type CreateModuleInput = {
  label: string;
  labelSingular: string;
  icon?: string;
  groupId?: string;
  fields: { fieldName: string; fieldType: string; options?: string[] }[];
};

export const createModule = async (input: CreateModuleInput) => {
  const response = await axiosClient.post(`/api/module`, input);

  return response.data as Pick<
    CrmModule,
    "id" | "key" | "label" | "labelSingular"
  >;
};

export type UpdateModuleInput = Partial<{
  label: string;
  labelSingular: string;
  icon: string;
  groupId: string | null;
  isArchived: boolean;
}>;

export const updateModule = async (id: string, input: UpdateModuleInput) => {
  const response = await axiosClient.patch(`/api/module/${id}`, input);

  return response.data as CrmModule;
};

// The whole visible order goes in one request: a drag renumbers every row after
// the one that moved.
export const reorderModules = async (moduleIds: string[]) => {
  const response = await axiosClient.patch(`/api/module/reorder`, {
    moduleIds,
  });

  return response.data as CrmModule[];
};
