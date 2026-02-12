import { Injectable, NotFoundException } from "@nestjs/common";
import { Priority, TicketCategory, TicketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";
import { CreateTicketDto } from "./dto/support.schema";

@Injectable()
export class SupportService {
  async getTickets(userId: string) {
    return prisma.supportTicket.findMany({
      where: { createBy: userId },
      include: {
        assignedToUser: {
          select: { id: true, user_name: true, user_image: true },
        },
        createByUser: {
          select: { id: true, user_name: true, user_image: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getTicketById(ticketId: string, userId: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, createBy: userId },
      include: {
        assignedToUser: {
          select: { id: true, user_name: true, user_image: true },
        },
        createByUser: {
          select: { id: true, user_name: true, user_image: true },
        },
        SupportTicketMessage: {
          include: {
            senderUser: {
              select: { id: true, user_name: true, user_image: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        SupportTicketAttachment: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  async createTicket(userId: string, data: CreateTicketDto) {
    return prisma.supportTicket.create({
      data: {
        title: data.title,
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        assignedTo: data.assignedTo,
        createBy: userId,
      },
    });
  }

  async updateTicket(
    ticketId: string,
    userId: string,
    data: {
      title?: string;
      subject?: string;
      description?: string;
      category?: TicketCategory;
      status?: TicketStatus;
      priority?: Priority;
      assignedTo?: string;
    }
  ) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, createBy: userId },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data,
    });
  }

  async deleteTicket(ticketId: string, userId: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId, createBy: userId },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    return prisma.supportTicket.delete({ where: { id: ticketId } });
  }

  async createTicketMessage(ticketId: string, userId: string, message: string) {
    return prisma.supportTicketMessage.create({
      data: {
        message,
        sender: userId,
        supportTicketId: ticketId,
      },
    });
  }

  async createTicketAttachment(ticketId: string, imageUrl: string) {
    return prisma.supportTicketAttachment.create({
      data: {
        imageUrl,
        supportTicketId: ticketId,
      },
    });
  }

  async getLiveChats(userId: string) {
    return prisma.supportLiveChat.findMany({
      where: { sender: userId },
      include: {
        senderUser: { select: { id: true, user_name: true, user_image: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getLiveChatById(chatId: string, userId: string) {
    const chat = await prisma.supportLiveChat.findFirst({
      where: { id: chatId, sender: userId },
      include: {
        senderUser: { select: { id: true, user_name: true, user_image: true } },
        messages: {
          include: {
            senderUser: {
              select: { id: true, user_name: true, user_image: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        attachments: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!chat) throw new NotFoundException("Live chat not found");
    return chat;
  }

  async createLiveChat(userId: string, message: string) {
    return prisma.supportLiveChat.create({
      data: {
        message,
        sender: userId,
      },
    });
  }

  async createLiveChatMessage(chatId: string, userId: string, message: string) {
    return prisma.supportLiveChatMessage.create({
      data: {
        message,
        sender: userId,
        supportLiveChatId: chatId,
      },
    });
  }

  async createLiveChatAttachment(
    chatId: string,
    userId: string,
    imageUrl: string
  ) {
    return prisma.supportLiveChatAttachment.create({
      data: {
        imageUrl,
        sender: userId,
        supportLiveChatId: chatId,
      },
    });
  }
}
