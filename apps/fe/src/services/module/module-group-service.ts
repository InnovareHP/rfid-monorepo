import { axiosClient } from "@/lib/axios-client";

export type ModuleGroup = {
  id: string;
  name: string;
  groupOrder: number;
  // Only the list endpoint counts members; a create or rename returns the row.
  _count?: { modules: number };
};

export const getModuleGroups = async () => {
  const response = await axiosClient.get(`/api/module-group`);

  return response.data as ModuleGroup[];
};

export const createModuleGroup = async (name: string) => {
  const response = await axiosClient.post(`/api/module-group`, { name });

  return response.data as ModuleGroup;
};

export const renameModuleGroup = async (id: string, name: string) => {
  const response = await axiosClient.patch(`/api/module-group/${id}`, { name });

  return response.data as ModuleGroup;
};

// The modules inside return to the top level rather than going with the folder.
export const deleteModuleGroup = async (id: string) => {
  const response = await axiosClient.delete(`/api/module-group/${id}`);

  return response.data as { id: string };
};

export const reorderModuleGroups = async (groupIds: string[]) => {
  const response = await axiosClient.patch(`/api/module-group/reorder`, {
    groupIds,
  });

  return response.data as ModuleGroup[];
};
