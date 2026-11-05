import { axiosClient } from "@/lib/axios-client";

export const getEmailIngestAddress = async () => {
  const response = await axiosClient.get("/api/email/ingest-address");
  return response.data as { address: string | null };
};

export type SentEmail = {
  id: string;
  recipientEmail: string | null;
  emailSubject: string | null;
  emailSentAt: string;
  senderEmail: string | null;
  openCount: number;
  lastOpenedAt: string | null;
  sentBy: string;
  recordId: string;
  recordName: string;
  moduleType: string;
};

export const getSentEmails = async (page: number, limit: number) => {
  const response = await axiosClient.get("/api/boards/emails", {
    params: { page, limit },
  });
  return response.data as { data: SentEmail[]; total: number };
};
