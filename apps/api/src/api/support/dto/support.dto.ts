import { Priority, TicketCategory, TicketStatus } from "@prisma/client";
import { z } from "zod";

export const CreateTicketSchema = z.object({
  title: z.string(),
  subject: z.string(),
  description: z.string(),
  category: z.enum(TicketCategory).optional(),
  priority: z.enum(Priority).optional(),
});

export const UpdateTicketSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  category: z.enum(TicketCategory).optional(),
  status: z.enum(TicketStatus).optional(),
  priority: z.enum(Priority).optional(),
});

export const CreateTicketMessageSchema = z.object({
  message: z.string(),
});

export const CreateTicketAttachmentSchema = z.object({
  imageUrl: z.string(),
});

export const CreateLiveChatSchema = z.object({
  message: z.string(),
});

export const CreateLiveChatMessageSchema = z.object({
  message: z.string(),
});

export const CreateLiveChatAttachmentSchema = z.object({
  imageUrl: z.string(),
});
