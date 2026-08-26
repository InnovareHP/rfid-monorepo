import { axiosClient } from "@/lib/axios-client";

export type ComplianceStatus = {
  hipaaEnabled: boolean;
  retentionDays: number;
  ipAllowlist: string[];
  planSupportsHipaa: boolean;
  baa: {
    version: string;
    signed: boolean;
    stale: boolean;
    acceptedAt: string | null;
    acceptedVersion: string | null;
    documentAvailable: boolean;
    companyLegalName: string | null;
    signerName: string | null;
    signerTitle: string | null;
    acceptanceMethod: string | null;
  };
};

export type BaaTerms = {
  version: string;
  clauses: string[];
  acknowledgement: string;
  entityTypes: string[];
  planSupportsHipaa: boolean;
};

export type SignBaaPayload = {
  companyLegalName: string;
  companyJurisdiction: string;
  companyEntityType: string;
  companyAddress: string;
  signerName: string;
  signerTitle: string;
  acknowledged: true;
  signature: string;
};

export const getComplianceStatus = async () => {
  const response = await axiosClient.get("/api/compliance/settings");

  return response.data as ComplianceStatus;
};

export const updateComplianceSettings = async (payload: {
  hipaaEnabled?: boolean;
  retentionDays?: number;
  ipAllowlist?: string[];
}) => {
  const response = await axiosClient.patch("/api/compliance/settings", payload);

  return response.data as ComplianceStatus;
};

export const getBaaTerms = async () => {
  const response = await axiosClient.get("/api/compliance/baa/terms");

  return response.data as BaaTerms;
};

export const signBaa = async (payload: SignBaaPayload) => {
  const response = await axiosClient.post("/api/compliance/baa/sign", payload);

  return response.data as ComplianceStatus;
};

// Both documents arrive as bytes, so the caller gets an object URL to open
// rather than a link into storage.
const fetchPdf = async (path: string) => {
  const response = await axiosClient.get(path, { responseType: "blob" });

  return URL.createObjectURL(
    new Blob([response.data], { type: "application/pdf" })
  );
};

export const getBlankBaaUrl = () => fetchPdf("/api/compliance/baa/document");

export const getSignedBaaUrl = () =>
  fetchPdf("/api/compliance/baa/document/signed");

// Irreversible. The confirmation is the organization name, checked server side
// against the stored name before anything is deleted.
export const purgeOrganizationData = async (confirmation: string) => {
  const response = await axiosClient.post("/api/compliance/purge", {
    confirmation,
  });

  return response.data as { deleted: number };
};
