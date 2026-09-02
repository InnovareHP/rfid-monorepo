import { axiosClient } from "@/lib/axios-client";
import type { BillingInterval } from "@dashboard/shared";

export type PlanSummary = {
  name: string;
  label: string;
  monthly: number;
  // Null when no yearly price is configured, which hides the yearly toggle.
  yearly: number | null;
  limits: {
    seats: number;
    ai: number;
    exportCsv: number;
    prioritySupport: number;
  };
  freeTrialDays: number;
  defaultSeats: number;
};

export type PlanCard = {
  plan: string | null;
  label: string | null;
  status: string | null;
  interval: BillingInterval;
  pricePerSeat: number | null;
  seats: number;
  total: number | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  limits: PlanSummary["limits"];
  memberCount: number;
  maxSeats: number;
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

// Brand and last four only, both straight from Stripe. Nothing PCI-sensitive
// crosses the API boundary.
export type PaymentMethodSummary = {
  type: string;
  brand: string | null;
  last4: string | null;
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
  paymentMethod: PaymentMethodSummary | null;
};

export const TRANSACTION_TYPES = [
  "SUBSCRIPTION",
  "SEAT_CHANGE",
  "REFUND",
  "OTHER",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export type TransactionRow = {
  id: string;
  type: TransactionType;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  amountCents: number;
  currency: string;
  description: string;
  stripeInvoiceId: string | null;
  createdAt: string;
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

export const getTransactions = async (params: {
  limit: number;
  offset: number;
  type?: TransactionType;
}) => {
  const response = await axiosClient.get("/api/billing/transactions", {
    params,
  });

  return response.data as { data: TransactionRow[]; total: number };
};

export const updateSeats = async (seats: number) => {
  const response = await axiosClient.post("/api/billing/seats", { seats });

  return response.data as { seats: number };
};

export const cancelSubscription = async () => {
  const response = await axiosClient.post("/api/billing/cancel");

  return response.data as { cancelAtPeriodEnd: boolean };
};

export const resumeSubscription = async () => {
  const response = await axiosClient.post("/api/billing/resume");

  return response.data as { cancelAtPeriodEnd: boolean };
};
