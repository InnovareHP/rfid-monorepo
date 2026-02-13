import { axiosClient } from "@/lib/axios-client";
import type { SupportTicket, TicketRow, TicketStatus } from "@dashboard/shared";

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
  imageUrl: string
) => {
  const response = await axiosClient.post(
    `/api/support/tickets/${ticketId}/attachments`,
    { imageUrl }
  );
  return response.data;
};
