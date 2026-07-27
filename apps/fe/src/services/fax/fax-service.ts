import { axiosClient } from "@/lib/axios-client";

export interface FaxIntegrationStatus {
  connected: boolean;
  apiKeyLast4: string | null;
}

export const getFaxIntegrationStatus = async () => {
  const response = await axiosClient.get("/api/fax/integration");
  return response.data as FaxIntegrationStatus;
};

export const connectFaxIntegration = async (apiKey: string) => {
  const response = await axiosClient.put("/api/fax/integration", { apiKey });
  return response.data as FaxIntegrationStatus;
};

export const disconnectFaxIntegration = async () => {
  const response = await axiosClient.delete("/api/fax/integration");
  return response.data as { connected: false };
};

export const sendFaxActivity = async (data: {
  recordId: string;
  title: string;
  description?: string;
  faxNumber: string;
  file: File;
}) => {
  const form = new FormData();
  form.append("recordId", data.recordId);
  form.append("title", data.title);
  if (data.description) form.append("description", data.description);
  form.append("faxNumber", data.faxNumber);
  form.append("file", data.file);

  const response = await axiosClient.post("/api/boards/activities/fax", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
