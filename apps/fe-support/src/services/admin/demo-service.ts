import { axiosClient } from "@/lib/axios-client";
import type { DemoRequestStatus } from "@dashboard/shared";

export type DemoRequest = {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  teamSize: string | null;
  notes: string | null;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  status: DemoRequestStatus;
  bookingId: string | null;
  assignedUserId: string | null;
  assignedHostName: string | null;
  scheduledAt: string | null;
  outcomeNotes: string | null;
};

export type DemoHost = {
  userId: string;
  name: string;
  email: string;
  hasBookingPage: boolean;
  slug: string | null;
  isActive: boolean;
  demoEnabled: boolean;
  demoLastAssignedAt: string | null;
};

export const listDemoRequests = async (params: {
  status?: DemoRequestStatus;
  search?: string;
  limit: number;
  offset: number;
}) => {
  const { data } = await axiosClient.get("/api/demo/admin/requests", { params });

  return data as { data: DemoRequest[]; total: number };
};

export const updateDemoRequest = async (
  id: string,
  body: { status?: DemoRequestStatus; outcomeNotes?: string | null }
) => {
  const { data } = await axiosClient.patch(
    `/api/demo/admin/requests/${id}`,
    body
  );

  return data as DemoRequest;
};

export const listDemoHosts = async () => {
  const { data } = await axiosClient.get("/api/demo/admin/hosts");

  return data as DemoHost[];
};

export const setDemoHost = async (userId: string, demoEnabled: boolean) => {
  const { data } = await axiosClient.post("/api/demo/admin/hosts", {
    userId,
    demoEnabled,
  });

  return data as { userId: string; demoEnabled: boolean };
};
