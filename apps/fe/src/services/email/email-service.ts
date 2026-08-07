import { axiosClient } from "@/lib/axios-client";

export const getEmailIngestAddress = async () => {
  const response = await axiosClient.get("/api/email/ingest-address");
  return response.data as { address: string | null };
};
