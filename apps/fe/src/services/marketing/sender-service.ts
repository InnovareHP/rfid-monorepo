import { axiosClient } from "@/lib/axios-client";

export type SenderKind = "PERSONAL" | "CUSTOM_DOMAIN";

export type DnsRecord = {
  type: "CNAME";
  name: string;
  value: string;
  purpose: string;
};

export type SenderIdentity = {
  id: string;
  organizationId: string;
  label: string;
  kind: SenderKind;
  status: "PENDING" | "VERIFIED" | "FAILED";
  fromEmail: string;
  fromName: string | null;
  domain: string | null;
  dnsRecords: DnsRecord[] | null;
  replyTo: string | null;
  verifiedAt: string | null;
  mailboxUserId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { campaigns: number };
};

export type CreateSenderInput =
  | { kind: "PERSONAL"; label: string; fromName?: string }
  | {
      kind: "CUSTOM_DOMAIN";
      label: string;
      fromName?: string;
      domain: string;
      mailbox?: string;
      replyTo?: string;
    };

export const getSenders = async (): Promise<SenderIdentity[]> => {
  const response = await axiosClient.get("/api/marketing/senders");
  return response.data;
};

export const getSender = async (id: string): Promise<SenderIdentity> => {
  const response = await axiosClient.get(`/api/marketing/senders/${id}`);
  return response.data;
};

export const createSender = async (
  data: CreateSenderInput
): Promise<SenderIdentity> => {
  const response = await axiosClient.post("/api/marketing/senders", data);
  return response.data;
};

// Re-reads SES rather than the stored row, so this is the only honest answer
// to "have my DNS records taken effect yet".
export const verifySender = async (id: string): Promise<SenderIdentity> => {
  const response = await axiosClient.post(
    `/api/marketing/senders/${id}/verify`
  );
  return response.data;
};

export const deleteSender = async (id: string) => {
  const response = await axiosClient.delete(`/api/marketing/senders/${id}`);
  return response.data;
};
