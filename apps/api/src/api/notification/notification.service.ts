import {
  categoryPrefixes,
  type NotificationCategoryValue,
} from "@dashboard/shared";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";

export type NotifyInput = {
  organizationId: string;
  recipientMemberIds: string[];
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  actorUserId?: string | null;
};

type NotificationRow = Prisma.NotificationGetPayload<{
  include: { actor: { select: { id: true; name: true; image: true } } };
}>;

const listInclude = {
  actor: { select: { id: true, name: true, image: true } },
} satisfies Prisma.NotificationInclude;

// How far back a search reaches, since matching happens after decryption.
const SEARCH_WINDOW = 500;

@Injectable()
export class NotificationService {
  private toDto(row: NotificationRow) {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      link: row.link,
      entityType: row.entityType,
      entityId: row.entityId,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      actor: row.actor
        ? { id: row.actor.id, name: row.actor.name, image: row.actor.image }
        : null,
    };
  }

  // Entry point every feature calls to raise in-app notifications.
  async notify(input: NotifyInput) {
    const recipientIds = [...new Set(input.recipientMemberIds)].filter(Boolean);
    if (!recipientIds.length) return { created: 0 };

    const members = await prisma.member.findMany({
      where: { id: { in: recipientIds }, organizationId: input.organizationId },
      select: { id: true, userId: true },
    });

    const targets = members.filter(
      (member) => member.userId !== input.actorUserId
    );
    if (!targets.length) return { created: 0 };

    const result = await prisma.notification.createMany({
      data: targets.map((member) => ({
        organizationId: input.organizationId,
        recipientId: member.id,
        actorUserId: input.actorUserId ?? null,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      })),
    });

    return { created: result.count };
  }

  private whereFor(
    organizationId: string,
    memberId: string,
    query: { unreadOnly?: boolean; category?: NotificationCategoryValue }
  ): Prisma.NotificationWhereInput {
    const prefixes = categoryPrefixes(query.category ?? "all");

    return {
      organizationId,
      recipientId: memberId,
      ...(query.unreadOnly ? { readAt: null } : {}),
      ...(prefixes.length
        ? { OR: prefixes.map((prefix) => ({ type: { startsWith: prefix } })) }
        : {}),
    };
  }

  async getNotifications(
    organizationId: string,
    memberId: string,
    query: {
      unreadOnly: boolean;
      category: NotificationCategoryValue;
      search: string;
      page: number;
      limit: number;
    }
  ) {
    const where = this.whereFor(organizationId, memberId, query);

    // Titles and bodies are encrypted at rest, so a search cannot be a SQL
    // LIKE. The recent window is decrypted and filtered here instead, which
    // is why searching does not reach beyond it.
    if (query.search) {
      const term = query.search.toLowerCase();
      const rows = await prisma.notification.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: "desc" },
        take: SEARCH_WINDOW,
      });

      const matched = rows
        .map((row) => this.toDto(row))
        .filter(
          (row) =>
            row.title.toLowerCase().includes(term) ||
            (row.body?.toLowerCase().includes(term) ?? false)
        );

      const start = (query.page - 1) * query.limit;

      return {
        data: matched.slice(start, start + query.limit),
        total: matched.length,
        nextPage: start + query.limit < matched.length ? query.page + 1 : null,
      };
    }

    const [rows, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: listInclude,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.toDto(row)),
      total,
      nextPage: query.page * query.limit < total ? query.page + 1 : null,
    };
  }

  async getStats(organizationId: string, memberId: string) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const scope = { organizationId, recipientId: memberId };

    const [total, unread, thisWeek] = await Promise.all([
      prisma.notification.count({ where: scope }),
      prisma.notification.count({ where: { ...scope, readAt: null } }),
      prisma.notification.count({
        where: { ...scope, createdAt: { gte: weekAgo } },
      }),
    ]);

    return { total, unread, thisWeek };
  }

  async getUnreadCount(organizationId: string, memberId: string) {
    const count = await prisma.notification.count({
      where: { organizationId, recipientId: memberId, readAt: null },
    });
    return { count };
  }

  async markRead(ids: string[], organizationId: string, memberId: string) {
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        organizationId,
        recipientId: memberId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async markAllRead(organizationId: string, memberId: string) {
    const result = await prisma.notification.updateMany({
      where: { organizationId, recipientId: memberId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async remove(id: string, organizationId: string, memberId: string) {
    const result = await prisma.notification.deleteMany({
      where: { id, organizationId, recipientId: memberId },
    });
    return { deleted: result.count };
  }

  async clearRead(organizationId: string, memberId: string) {
    const result = await prisma.notification.deleteMany({
      where: { organizationId, recipientId: memberId, readAt: { not: null } },
    });
    return { deleted: result.count };
  }
}
