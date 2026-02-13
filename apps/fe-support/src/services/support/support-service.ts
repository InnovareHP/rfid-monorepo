import { axiosClient } from "@/lib/axios-client";
import type { SupportTicket } from "@dashboard/shared";

export type SupportTicketListItem = {
  id: string;
  title: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export const createSupportTicket = async (ticket: SupportTicket) => {
  const response = await axiosClient.post(`/api/support/tickets`, ticket);

  return response.data;
};

export const getSupportTickets = async (): Promise<SupportTicketListItem[]> => {
  const response = await axiosClient.get<SupportTicketListItem[]>(
    "/api/support/tickets"
  );
  return response.data;
};
