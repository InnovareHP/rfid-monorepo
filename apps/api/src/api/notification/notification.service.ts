import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  decryptNullable,
  decryptString,
  encryptNullable,
  encryptString,
} from "../../lib/crypto/crypto";
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

@Injectable()
export class NotificationService {
  private toDto(row: NotificationRow) {
    return {
      id: row.id,
      type: row.type,
      title: decryptString(row.title),
      body: decryptNullable(row.body),
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
        title: encryptString(input.title),
        body: encryptNullable(input.body ?? null),
        link: input.link ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      })),
    });

    return { created: result.count };
  }

  async getNotifications(
    organizationId: string,
    memberId: string,
    query: { unreadOnly: boolean; page: number; limit: number }
  ) {
    const where: Prisma.NotificationWhereInput = {
      organizationId,
      recipientId: memberId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

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
