import { ROLES, User } from "@dashboard/shared";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  HistoryChangeType,
  Priority,
  Prisma,
  TicketCategory,
  TicketStatus,
} from "@prisma/client";
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

    const rawTickets = await prisma.supportTicket.findMany({
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
        assignedTo: true,
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
        _count: {
          select: {
            SupportTicketMessage: {
              where: { senderUser: { user_role: ROLES.SUPPORT } },
            },
          },
        },
      },
      skip: offset,
    });
    const total = await prisma.supportTicket.count({ where: where });
    const tickets = rawTickets.map(({ _count, ...t }) => ({
      ...t,
      hasAgentReply: _count.SupportTicketMessage > 0,
    }));
    return { tickets, total };
  }

  async getTicketById(ticketId: string) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { ticketNumber: ticketId },
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

  async getSupportAgents() {
    return prisma.user_table.findMany({
      where: { user_role: ROLES.SUPPORT },
      select: { id: true, user_name: true, user_image: true },
    });
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
            changeType: "CREATED",
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

  async assignTicket(
    ticketId: string,
    agentId: string,
    requestingUserId: string
  ) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedTo: agentId,
        SupportHistory: {
          create: {
            message: "Ticket reassigned to a different agent",
            changeType: "ASSIGNED",
            sender: requestingUserId,
          },
        },
      },
    });
  }

  async rateTicket(
    ticketId: string,
    userId: string,
    rating: number,
    comment?: string
  ) {
    const ticket = await prisma.supportTicket.findFirst({
      where: { ticketNumber: ticketId, createBy: userId },
    });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (ticket.status !== "CLOSED" && ticket.status !== "RESOLVED") {
      throw new BadRequestException(
        "Can only rate a ticket that is closed or resolved"
      );
    }

    return prisma.supportTicketRating.upsert({
      where: { supportTicketId: ticket.id },
      create: {
        rating,
        comment,
        supportTicketId: ticket.id,
        createdBy: userId,
      },
      update: { rating, comment },
    });
  }

  async getTicketHistory(ticketId: string, user: User & { role: string }) {
    const where: Prisma.SupportTicketWhereInput = { ticketNumber: ticketId };

    if (user.role === ROLES.SUPPORT) {
      where.assignedTo = user.id;
    } else {
      where.createBy = user.id;
    }

    const ticket = await prisma.supportTicket.findFirst({ where });
    if (!ticket) throw new NotFoundException("Ticket not found");

    return prisma.supportHistory.findMany({
      where: { supportTicketId: ticket.id },
      include: {
        senderUser: { select: { id: true, user_name: true, user_image: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async closeTicket(ticketId: string, user: AuthenticatedSession["user"]) {
    const where: Prisma.SupportTicketWhereInput = { id: ticketId };

    if (user.role === ROLES.SUPPORT) {
      where.assignedTo = user.id;
    } else {
      where.createBy = user.id;
    }

    const ticket = await prisma.supportTicket.findFirst({ where });
    if (!ticket) throw new NotFoundException("Ticket not found");
    if (ticket.status === "CLOSED") {
      throw new BadRequestException("Ticket is already closed");
    }

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: "CLOSED",
        SupportHistory: {
          create: {
            message: "Ticket closed",
            changeType: "CLOSED",
            sender: user.id,
          },
        },
      },
    });
  }

  async updateSupportTicketStatus(
    ticketId: string,
    user: AuthenticatedSession["user"],
    status: TicketStatus
  ) {
    const where: Prisma.SupportTicketWhereInput = { id: ticketId };

    if (user.role === ROLES.SUPPORT) {
      where.assignedTo = user.id;
    } else {
      where.createBy = user.id;
    }

    const ticket = await prisma.supportTicket.findFirst({ where });
    if (!ticket) throw new NotFoundException("Ticket not found");
    // if (ticket.status !== "CLOSED") {
    //   throw new BadRequestException("Only closed tickets can be reopened");
    // }

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: status,
        SupportHistory: {
          create: {
            message: `Ticket ${status}`,
            changeType: status as HistoryChangeType,
            sender: user.id,
          },
        },
      },
    });
  }

  async getStats(user: AuthenticatedSession["user"]) {
    const [
      open,
      inProgress,
      resolved,
      closed,
      unassigned,
      csatAgg,
      ticketsWithFirstReply,
      resolvedTickets,
    ] = await Promise.all([
      prisma.supportTicket.count({
        where: {
          status: "OPEN",
          ...(user.role === ROLES.SUPPORT && { assignedTo: user.id }),
        },
      }),
      prisma.supportTicket.count({
        where: {
          status: "IN_PROGRESS",
          ...(user.role === ROLES.SUPPORT && { assignedTo: user.id }),
        },
      }),
      prisma.supportTicket.count({
        where: {
          status: "RESOLVED",
          ...(user.role === ROLES.SUPPORT && { assignedTo: user.id }),
        },
      }),
      prisma.supportTicket.count({
        where: {
          status: "CLOSED",
          ...(user.role === ROLES.SUPPORT && { assignedTo: user.id }),
        },
      }),
      prisma.supportTicket.count({
        where: { ...(user.role === ROLES.SUPPORT && { assignedTo: user.id }) },
      }),
      prisma.supportTicketRating.aggregate({
        _avg: { rating: true },
        _count: { rating: true },
        where: {
          supportTicket: {
            ...(user.role === ROLES.SUPPORT && { assignedTo: user.id }),
          },
        },
      }),
      prisma.supportTicket.findMany({
        where: {
          ...(user.role === ROLES.SUPPORT && { assignedTo: user.id }),
          SupportTicketMessage: {
            some: { senderUser: { user_role: ROLES.SUPPORT } },
          },
        },
        select: {
          createdAt: true,
          SupportTicketMessage: {
            where: { senderUser: { user_role: ROLES.SUPPORT } },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),

      prisma.supportTicket.findMany({
        where: {
          ...(user.role === ROLES.SUPPORT && { assignedTo: user.id }),
          status: { in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
        select: {
          createdAt: true,
          SupportHistory: {
            where: {
              changeType: {
                in: [HistoryChangeType.RESOLVED, HistoryChangeType.CLOSED],
              },
            },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
    ]);

    const toHours = (ms: number) => Math.round(ms / 3_600_000);

    const firstReplyMs = ticketsWithFirstReply
      .filter((t) => t.SupportTicketMessage.length > 0)
      .map(
        (t) =>
          t.SupportTicketMessage[0].createdAt.getTime() - t.createdAt.getTime()
      );

    const resolutionMs = resolvedTickets
      .filter((t) => t.SupportHistory.length > 0)
      .map(
        (t) => t.SupportHistory[0].createdAt.getTime() - t.createdAt.getTime()
      );

    const avg = (arr: number[]) =>
      arr.length > 0
        ? toHours(arr.reduce((a, b) => a + b, 0) / arr.length)
        : null;

    return {
      open,
      inProgress,
      resolved,
      closed,
      unassigned,
      avgCsat: csatAgg._avg.rating
        ? Number(csatAgg._avg.rating.toFixed(1))
        : null,
      totalRatings: csatAgg._count.rating,
      avgFirstReplyHours: avg(firstReplyMs),
      avgResolutionHours: avg(resolutionMs),
    };
  }

  async getRatings(
    page: number,
    take: number,
    user: AuthenticatedSession["user"]
  ) {
    const offset = (page - 1) * take;
    const [ratings, total] = await Promise.all([
      prisma.supportTicketRating.findMany({
        skip: offset,
        take,
        where: {
          supportTicket: {
            ...(user.role === ROLES.SUPPORT && { assignedTo: user.id }),
          },
        },
        orderBy: { createdAt: "desc" },
        include: {
          supportTicket: {
            select: { ticketNumber: true, title: true, subject: true },
          },
          createdByUser: {
            select: { id: true, user_name: true, user_image: true },
          },
        },
      }),
      prisma.supportTicketRating.count({
        where: {
          supportTicket: {
            ...(user.role === ROLES.SUPPORT && { assignedTo: user.id }),
          },
        },
      }),
    ]);
    return { ratings, total };
  }
}
