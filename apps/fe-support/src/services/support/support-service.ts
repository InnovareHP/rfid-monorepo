import { axiosClient } from "@/lib/axios-client";
import type { SupportTicket } from "@dashboard/shared";

export const createSupportTicket = async (ticket: SupportTicket) => {
  const response = await axiosClient.post(`/api/support/tickets`, ticket);

  return response.data;
};
