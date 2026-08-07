import { axiosClient } from "@/lib/axios-client";

export type MarketingBlast = {
  id: string;
  organizationId: string;
  campaignId: string | null;
  name: string;
  subject: string;
  bodyHtml: string;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED";
  groups: { group: { id: string; name: string; moduleType: string } }[];
  scheduledAt: string | null;
  sentAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { recipients: number };
};

export type BlastJobStatus = {
  jobId: string;
  status: string;
  progress: unknown;
  result: { sent: number; failed: number; total: number } | null;
  failedReason: string | null;
};

// Fields for the given moduleType, used to render the audience filter panel.
export type BoardFieldOption = {
  id: string;
  name: string;
  type: string;
};

export const getBoardFieldsByModule = async (
  moduleType: string
): Promise<BoardFieldOption[]> => {
  const response = await axiosClient.get("/api/boards/column", {
    params: { moduleType },
  });
  return response.data;
};

export const getBlasts = async (): Promise<MarketingBlast[]> => {
  const response = await axiosClient.get("/api/marketing/blasts");
  return response.data;
};

export const getBlast = async (id: string): Promise<MarketingBlast> => {
  const response = await axiosClient.get(`/api/marketing/blasts/${id}`);
  return response.data;
};

export const createBlast = async (data: {
  name: string;
  campaignId?: string;
  subject: string;
  bodyHtml: string;
  groupIds?: string[];
  scheduledAt?: string;
}): Promise<MarketingBlast> => {
  const response = await axiosClient.post("/api/marketing/blasts", data);
  return response.data;
};

export const updateBlast = async (
  id: string,
  data: Partial<{
    name: string;
    campaignId: string | null;
    subject: string;
    bodyHtml: string;
    groupIds: string[];
    scheduledAt: string;
  }>
): Promise<MarketingBlast> => {
  const response = await axiosClient.patch(`/api/marketing/blasts/${id}`, data);
  return response.data;
};

export const deleteBlast = async (id: string) => {
  const response = await axiosClient.delete(`/api/marketing/blasts/${id}`);
  return response.data;
};

export const sendBlast = async (
  id: string,
  data: { sendVia?: "AUTO" | "GMAIL" | "OUTLOOK" } = {}
): Promise<{ jobId: string }> => {
  const response = await axiosClient.post(
    `/api/marketing/blasts/${id}/send`,
    data
  );
  return response.data;
};

export const getBlastAudienceCount = async (
  id: string
): Promise<{ count: number; total: number }> => {
  const response = await axiosClient.get(
    `/api/marketing/blasts/${id}/audience-count`
  );
  return response.data;
};

export const getBlastJobStatus = async (
  jobId: string
): Promise<BlastJobStatus> => {
  const response = await axiosClient.get(
    `/api/marketing/blasts/jobs/${jobId}/status`
  );
  return response.data;
};
