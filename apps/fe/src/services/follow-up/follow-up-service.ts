import { axiosClient } from "@/lib/axios-client";
import type { ActivityKind } from "@/services/lead/lead-service";

export type FollowUpRow = {
  recordId: string;
  recordName: string;
  moduleType: string;
  moduleLabel: string;
  assignedTo: { id: string; name: string } | null;
  lastContactedAt: string | null;
  referralReceivedAt: string | null;
  followUp: {
    activityId: string;
    title: string;
    activityType: ActivityKind;
    dueDate: string;
  } | null;
};

export type FollowUpDigest = {
  data: FollowUpRow[];
  pagination: { page: number; limit: number; count: number };
};

export const getFollowUpDigest = async (params: {
  moduleType?: string;
  assignedTo?: string;
  dueBefore?: string;
  page?: number;
  limit?: number;
}) => {
  const response = await axiosClient.get("/api/boards/follow-ups", { params });
  return response.data as FollowUpDigest;
};

export const getRecordFollowUp = async (recordId: string) => {
  const response = await axiosClient.get(`/api/boards/${recordId}/follow-up`);
  return response.data as FollowUpRow | null;
};
