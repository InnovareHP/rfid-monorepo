import { axiosClient } from "@/lib/axios-client";

export type TeamMember = {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
};

export type ListMembersResponse = {
  members: TeamMember[];
  total: number;
};

export type ListMembersParams = {
  page: number;
  limit: number;
  search: string;
};

export const listMembers = async (params: ListMembersParams) => {
  const response = await axiosClient.get("/api/team/members", {
    params: {
      page: params.page,
      limit: params.limit,
      ...(params.search && { search: params.search }),
    },
  });

  return response.data as ListMembersResponse;
};
