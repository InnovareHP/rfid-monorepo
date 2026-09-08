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

// Totals for the section headers, which a single page cannot know. Null when
// the caller did not send its local day boundaries.
export type FollowUpBuckets = {
  overdue: number;
  today: number;
  upcoming: number;
  total: number;
} | null;

export type FollowUpDigest = {
  data: FollowUpRow[];
  pagination: { page: number; limit: number; hasMore: boolean };
  buckets: FollowUpBuckets;
};

export const getFollowUpDigest = async (params: {
  moduleType?: string;
  assignedTo?: string;
  dueBefore?: string;
  dayStart?: string;
  dayEnd?: string;
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
