import { axiosClient } from "@/lib/axios-client";

export type MarketingCampaign = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { forms: number; blasts: number; landingPages: number };
};

export const getCampaigns = async (): Promise<MarketingCampaign[]> => {
  const response = await axiosClient.get("/api/marketing/campaigns");
  return response.data;
};

export const getCampaign = async (id: string): Promise<MarketingCampaign> => {
  const response = await axiosClient.get(`/api/marketing/campaigns/${id}`);
  return response.data;
};

export const createCampaign = async (data: {
  name: string;
  description?: string;
}): Promise<MarketingCampaign> => {
  const response = await axiosClient.post("/api/marketing/campaigns", data);
  return response.data;
};

export const updateCampaign = async (
  id: string,
  data: Partial<{
    name: string;
    description: string;
    status: MarketingCampaign["status"];
  }>
): Promise<MarketingCampaign> => {
  const response = await axiosClient.patch(
    `/api/marketing/campaigns/${id}`,
    data
  );
  return response.data;
};

export const archiveCampaign = async (
  id: string
): Promise<MarketingCampaign> => {
  const response = await axiosClient.post(
    `/api/marketing/campaigns/${id}/archive`
  );
  return response.data;
};

export const deleteCampaign = async (id: string) => {
  const response = await axiosClient.delete(`/api/marketing/campaigns/${id}`);
  return response.data;
};
