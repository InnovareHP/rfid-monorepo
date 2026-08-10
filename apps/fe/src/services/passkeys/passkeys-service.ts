import { axiosClient } from "@/lib/axios-client";

export type PasskeyDevice = {
  id: string;
  label: string;
  deviceType: string;
  backedUp: boolean;
  createdAt: string | null;
};

export type EnrollmentGrant = {
  code: string;
  expiresInSeconds: number;
};

export const getPasskeys = async () => {
  const response = await axiosClient.get("/api/passkeys");

  return response.data as PasskeyDevice[];
};

export type PasskeyPrompt = {
  shouldPrompt: boolean;
  passkeyCount: number;
};

export const getPasskeyPrompt = async () => {
  const response = await axiosClient.get("/api/passkeys/prompt");

  return response.data as PasskeyPrompt;
};

// Declining is remembered, so the offer is made once and never nags again.
export const waivePasskeyPrompt = async () => {
  const response = await axiosClient.post("/api/passkeys/prompt/waive");

  return response.data as { waived: boolean };
};

export const createEnrollmentCode = async () => {
  const response = await axiosClient.post("/api/passkeys/enrollment-code");

  return response.data as EnrollmentGrant;
};

export const removePasskey = async (passkeyId: string) => {
  const response = await axiosClient.delete(`/api/passkeys/${passkeyId}`);

  return response.data as { success: boolean };
};

export const resetMemberPasskeys = async (memberId: string, reason?: string) => {
  const response = await axiosClient.post(
    `/api/passkeys/members/${memberId}/reset`,
    { reason }
  );

  return response.data as EnrollmentGrant & { removedCount: number };
};

export const sendSignupOtp = async (email: string) => {
  const response = await axiosClient.post("/api/registration/otp/send", {
    email,
  });

  return response.data as { sent: boolean };
};

export const verifySignupOtp = async (
  email: string,
  name: string,
  code: string
) => {
  const response = await axiosClient.post("/api/registration/otp/verify", {
    email,
    name,
    code,
  });

  return response.data as { context: string; expiresInSeconds: number };
};

export const getInvitationContext = async (invitationId: string) => {
  const response = await axiosClient.post(
    "/api/registration/invitation/context",
    { invitationId }
  );

  return response.data as {
    context: string;
    email: string;
    expiresInSeconds: number;
  };
};

export const sendMigrationOtp = async (email: string) => {
  const response = await axiosClient.post("/api/registration/migrate/send", {
    email,
  });

  return response.data as { sent: boolean };
};

export const verifyMigrationOtp = async (email: string, code: string) => {
  const response = await axiosClient.post("/api/registration/migrate/verify", {
    email,
    code,
  });

  return response.data as { context: string; expiresInSeconds: number };
};
