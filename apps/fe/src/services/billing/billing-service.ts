import { axiosClient } from "@/lib/axios-client";

export type PlanSummary = {
  name: string;
  label: string;
  pricePerSeat: number;
  limits: {
    seats: number;
    ai: number;
    exportCsv: number;
    prioritySupport: number;
  };
  freeTrialDays: number;
};

export type PlanCard = {
  plan: string | null;
  label: string | null;
  status: string | null;
  pricePerSeat: number | null;
  seats: number;
  monthlyTotal: number | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  limits: PlanSummary["limits"];
  memberOverCap: boolean;
  members: { id: string; role: string; email: string; name: string }[];
  pendingInvoice: {
    id: string;
    status: string;
    amountDue: number;
    currency: string;
    hostedInvoiceUrl: string | null;
    invoicePdf: string | null;
  } | null;
};

export type InvoiceRow = {
  id: string;
  number: string | null;
  status: string;
  amountPaid: number;
  amountDue: number;
  currency: string;
  created: string;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
};

export const getPlans = async () => {
  const response = await axiosClient.get("/api/billing/plans");

  return response.data as PlanSummary[];
};

export const getPlanCard = async () => {
  const response = await axiosClient.get("/api/billing/plan");

  return response.data as PlanCard;
};

export const getInvoices = async (startingAfter?: string) => {
  const response = await axiosClient.get("/api/billing/invoices", {
    params: startingAfter ? { startingAfter } : undefined,
  });

  return response.data as { data: InvoiceRow[]; hasMore: boolean };
};

export const cancelSubscription = async () => {
  const response = await axiosClient.post("/api/billing/cancel");

  return response.data as { cancelAtPeriodEnd: boolean };
};

export const resumeSubscription = async () => {
  const response = await axiosClient.post("/api/billing/resume");

  return response.data as { cancelAtPeriodEnd: boolean };
};
