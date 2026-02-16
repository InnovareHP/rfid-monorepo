import { axiosClient } from "@/lib/axios-client";

export interface InvitationDetails {
  email: string;
  organizationName: string;
  organizationId: string;
  inviterName: string;
  userExists: boolean;
}

export async function getInvitationDetails(
  token: string
): Promise<InvitationDetails> {
  const { data } = await axiosClient.get(`/api/auth/invitation/${token}`);
  return data;
}

export async function verifyInviteEmail(token: string) {
  const { data } = await axiosClient.post(
    `/api/auth/invitation/${token}/verify-email`
  );
  return data;
}
