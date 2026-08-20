import { axiosClient } from "@/lib/axios-client";

export type AudienceFilter = {
  filter: Record<string, string>;
  search?: string;
  boardDateFrom?: string;
  boardDateTo?: string;
};

export type AudienceType = "BOARD" | "SUBSCRIBER";

export type RecipientGroup = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  moduleType: string;
  audienceType: AudienceType;
  filter: AudienceFilter;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { blasts: number };
};

export type GroupMember = {
  recordId: string | null;
  subscriberId: string | null;
  recordName: string;
  email: string | null;
};

// reachable is the subset that will actually be mailed; total includes the
// records the group matched but that carry no email.
export type GroupMembersPage = {
  total: number;
  reachable: number;
  page: number;
  limit: number;
  members: GroupMember[];
};

export type GroupInput = {
  name: string;
  description?: string;
  moduleType: string;
  audienceType: AudienceType;
  filter: AudienceFilter;
};

export const getGroups = async (): Promise<RecipientGroup[]> => {
  const response = await axiosClient.get("/api/marketing/groups");
  return response.data;
};

export const getGroup = async (id: string): Promise<RecipientGroup> => {
  const response = await axiosClient.get(`/api/marketing/groups/${id}`);
  return response.data;
};

export const getGroupMembers = async (
  id: string,
  params: { page: number; limit: number }
): Promise<GroupMembersPage> => {
  const response = await axiosClient.get(
    `/api/marketing/groups/${id}/members`,
    { params }
  );
  return response.data;
};

export const previewGroupMembers = async (
  data: {
    moduleType: string;
    audienceType: AudienceType;
    filter: AudienceFilter;
  },
  params: { page: number; limit: number }
): Promise<GroupMembersPage> => {
  const response = await axiosClient.post(
    "/api/marketing/groups/preview",
    data,
    { params }
  );
  return response.data;
};

export const createGroup = async (
  data: GroupInput
): Promise<RecipientGroup> => {
  const response = await axiosClient.post("/api/marketing/groups", data);
  return response.data;
};

export const updateGroup = async (
  id: string,
  data: Partial<GroupInput>
): Promise<RecipientGroup> => {
  const response = await axiosClient.patch(
    `/api/marketing/groups/${id}`,
    data
  );
  return response.data;
};

export const deleteGroup = async (id: string) => {
  const response = await axiosClient.delete(`/api/marketing/groups/${id}`);
  return response.data;
};
