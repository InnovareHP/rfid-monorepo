import { axiosClient } from "@/lib/axios-client";
import type {
  SupportAgent,
  SupportTicket,
  TicketHistoryEntry,
  TicketRating,
  TicketRatingRow,
  TicketRow,
  TicketStats,
  TicketStatus,
} from "@dashboard/shared";

export const createSupportTicket = async (ticket: SupportTicket) => {
  const response = await axiosClient.post(`/api/support/tickets`, ticket);

  return response.data;
};

export const getSupportTickets = async (params: {
  page: number;
  take: number;
  search?: string;
  status?: string | null;
  category?: string | null;
  priority?: string | null;
}): Promise<{ tickets: TicketRow[]; total: number }> => {
  const response = await axiosClient.get("/api/support/tickets", {
    params,
  });
  return response.data;
};

export const getSupportTicketById = async (id: string) => {
  const response = await axiosClient.get(`/api/support/tickets/${id}`);
  return response.data;
};

export const updateSupportTicket = async (
  id: string,
  data: Partial<{
    title: string;
    subject: string;
    description: string;
    status: TicketStatus;
    priority: string;
    category: string;
  }>
) => {
  const response = await axiosClient.patch(`/api/support/tickets/${id}`, data);
  return response.data;
};

export const deleteSupportTicket = async (id: string): Promise<void> => {
  await axiosClient.delete(`/api/support/tickets/${id}`);
};

export const createTicketMessage = async (
  ticketId: string,
  message: string
) => {
  const response = await axiosClient.post(
    `/api/support/tickets/${ticketId}/messages`,
    { message }
  );
  return response.data;
};

export const createTicketAttachment = async (
  ticketId: string,
  messageId: string,
  imageUrl: string
) => {
  const response = await axiosClient.post(
    `/api/support/tickets/${ticketId}/messages/${messageId}/attachments`,
    { imageUrl }
  );
  return response.data;
};

export const getSupportAgents = async (): Promise<SupportAgent[]> => {
  const response = await axiosClient.get("/api/support/agents");
  return response.data;
};

export const assignTicket = async (
  ticketId: string,
  agentId: string
): Promise<void> => {
  await axiosClient.patch(`/api/support/tickets/${ticketId}/assign`, {
    agentId,
  });
};

export const getTicketHistory = async (
  ticketId: string
): Promise<TicketHistoryEntry[]> => {
  const response = await axiosClient.get(
    `/api/support/tickets/${ticketId}/history`
  );
  return response.data;
};

export const updateSupportTicketStatus = async (
  ticketId: string,
  status: TicketStatus
): Promise<void> => {
  await axiosClient.patch(`/api/support/tickets/${ticketId}/${status}`);
};

export const rateTicket = async (
  ticketId: string,
  rating: number,
  comment?: string
): Promise<TicketRating> => {
  const response = await axiosClient.post(
    `/api/support/tickets/${ticketId}/rating`,
    { rating, comment }
  );
  return response.data;
};

export const getTicketStats = async (): Promise<TicketStats> => {
  const response = await axiosClient.get("/api/support/stats");
  return response.data;
};

export const getTicketRatings = async (
  page: number,
  take: number
): Promise<{ ratings: TicketRatingRow[]; total: number }> => {
  const response = await axiosClient.get("/api/support/ratings", {
    params: { page, take },
  });
  return response.data;
};
