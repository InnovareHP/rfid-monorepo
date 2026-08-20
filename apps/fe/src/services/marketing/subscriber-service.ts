import { axiosClient } from "@/lib/axios-client";

export type SubscriberStatus = "SUBSCRIBED" | "UNSUBSCRIBED";

export type EmailSubscriber = {
  id: string;
  email: string;
  name: string | null;
  status: SubscriberStatus;
  source: "FORM" | "MANUAL" | "IMPORT" | "BLAST";
  subscribedAt: string;
  unsubscribedAt: string | null;
  recordId: string | null;
  createdAt: string;
};

export type SubscriberListResponse = {
  total: number;
  page: number;
  limit: number;
  subscribers: EmailSubscriber[];
};

export const getSubscribers = async (params: {
  status?: SubscriberStatus;
  search?: string;
  page: number;
  limit: number;
}): Promise<SubscriberListResponse> => {
  const response = await axiosClient.get("/api/marketing/subscribers", {
    params,
  });
  return response.data;
};

export const createSubscriber = async (data: {
  email: string;
  name?: string;
}): Promise<EmailSubscriber> => {
  const response = await axiosClient.post("/api/marketing/subscribers", data);
  return response.data;
};

export const unsubscribeSubscriber = async (
  id: string
): Promise<EmailSubscriber> => {
  const response = await axiosClient.patch(
    `/api/marketing/subscribers/${id}/unsubscribe`
  );
  return response.data;
};

export const resubscribeSubscriber = async (
  id: string
): Promise<EmailSubscriber> => {
  const response = await axiosClient.patch(
    `/api/marketing/subscribers/${id}/resubscribe`
  );
  return response.data;
};

export const deleteSubscriber = async (id: string) => {
  const response = await axiosClient.delete(
    `/api/marketing/subscribers/${id}`
  );
  return response.data;
};

// Public, token-addressed endpoints reached from an email footer.
// The link carries a signed claim, not the address, so the page never receives
// an email to display.
export type PublicSubscription = {
  organizationName: string;
  status: SubscriberStatus;
};

export const getPublicSubscription = async (
  token: string
): Promise<PublicSubscription> => {
  const response = await axiosClient.get(
    `/api/marketing/public/unsubscribe/${token}`
  );
  return response.data;
};

export const publicUnsubscribe = async (
  token: string
): Promise<PublicSubscription> => {
  const response = await axiosClient.post(
    `/api/marketing/public/unsubscribe/${token}`
  );
  return response.data;
};

export const getSubscribeTarget = async (
  token: string
): Promise<{ organizationName: string }> => {
  const response = await axiosClient.get(
    `/api/marketing/public/subscribe/${token}`
  );
  return response.data;
};

export const publicSubscribe = async (
  token: string,
  data: { email: string; name?: string }
): Promise<{ organizationName: string }> => {
  const response = await axiosClient.post(
    `/api/marketing/public/subscribe/${token}`,
    data
  );
  return response.data;
};

export const publicResubscribe = async (
  token: string
): Promise<PublicSubscription> => {
  const response = await axiosClient.post(
    `/api/marketing/public/unsubscribe/${token}/resubscribe`
  );
  return response.data;
};
