import { ROLES, User } from "@dashboard/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Priority, Prisma, TicketCategory, TicketStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";
import { CreateTicketDto } from "./dto/support.schema";

@Injectable()
export class SupportService {
  async getTickets(
    user: User & { role: string },
    take: number,
    page: number = 1,
    priority?: Priority,
    status?: TicketStatus | "ALL",
    category?: TicketCategory
  ) {
    const offset = (page - 1) * take;
    const where: Prisma.SupportTicketWhereInput = {};

    if (user.role !== ROLES.USER) {
      where.createBy = undefined;
    } else {
      where.createBy = user.id;
    }

    if (user.role === ROLES.SUPPORT) {
      where.assignedTo = user.id;
    }

    if (priority) {
      where.priority = priority;
    }

    if (status) {
      if (status === "ALL") {
        where.status = undefined;
      } else {
        where.status = status;
      }
    }

    if (category) {
      where.category = category;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        subject: true,
        category: true,
        status: true,
        priority: true,
        createBy: true,
        createdAt: true,
        updatedAt: true,
        ...(user.role === ROLES.SUPPORT && {
          assignedToUser: {
            select: { id: true, user_name: true, user_image: true },
          },
        }),
        createByUser: {
          select: { id: true, user_name: true, user_image: true },
        },
      },
      skip: offset,
    });
    const total = await prisma.supportTicket.count({ where: where });
    return { tickets, total: total };
  }

  async getTicketById(ticketId: string, userId: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { ticketNumber: ticketId, createBy: userId },
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
            SupportTicketAttachment: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "asc" },
        },
        SupportHistory: {
          orderBy: { createdAt: "desc" },
          select: {
            createdAt: true,
          },
          take: 1,
        },
      },
    });

    if (!ticket) throw new NotFoundException("Ticket not found");
    return ticket;
  }

  async getNextSupportAgent(): Promise<string> {
    const supportUsers = await prisma.user_table.findMany({
      where: { user_role: ROLES.SUPPORT },
      select: {
        id: true,
        _count: {
          select: {
            SupportTicketAssignedTo: {
              where: { status: { not: "CLOSED" } },
            },
          },
        },
      },
    });

    if (supportUsers.length === 0) {
      throw new NotFoundException("No support agents available");
    }

    const minCount = Math.min(
      ...supportUsers.map((u) => u._count.SupportTicketAssignedTo)
    );
    const leastBusy = supportUsers.filter(
      (u) => u._count.SupportTicketAssignedTo === minCount
    );

    return leastBusy[Math.floor(Math.random() * leastBusy.length)].id;
  }

  async createTicket(userId: string, data: CreateTicketDto) {
    const assignedTo = await this.getNextSupportAgent();

    return prisma.supportTicket.create({
      data: {
        title: data.title,
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority,
        assignedTo,
        createBy: userId,
        SupportTicketMessage: {
          create: {
            message: data.description,
            sender: userId,
            SupportTicketAttachment: {
              create: data.imageUrl.map((image) => ({ imageUrl: image })),
            },
          },
        },
        SupportHistory: {
          create: {
            message: data.description,
            sender: userId,
          },
        },
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
      data: {
        ...data,
        SupportHistory: {
          create: {
            message: data.description || "",
            sender: userId,
          },
        },
      },
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
    return Promise.all([
      prisma.supportTicketMessage.create({
        data: {
          message,
          sender: userId,
          supportTicketId: ticketId,
        },
      }),
      prisma.supportHistory.create({
        data: {
          message,
          sender: userId,
          supportTicketId: ticketId,
        },
      }),
    ]);
  }

  async createTicketAttachment(
    supportTicketMessageId: string,
    imageUrl: string
  ) {
    return prisma.supportTicketAttachment.create({
      data: {
        imageUrl,
        supportTicketMessageId: supportTicketMessageId,
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
