import {
  boardNotificationType,
  BOARD_NOTIFICATION_EVENT,
  ROLES,
  type BoardNotificationEvent,
} from "@dashboard/shared";
import { Injectable, Logger } from "@nestjs/common";
import { prisma } from "../../lib/prisma/prisma";
import { NotificationService } from "../notification/notification.service";

type BoardNotifyInput = {
  recordId: string;
  organizationId: string;
  moduleType: string;
  event: BoardNotificationEvent;
  // Built from the record name, which only this service reads back decrypted.
  title: (recordName: string) => string;
  body?: string | null;
  actorUserId?: string | null;
};

// Events the whole org leadership cares about even when nobody is assigned yet.
const LEADERSHIP_EVENTS: BoardNotificationEvent[] = [
  BOARD_NOTIFICATION_EVENT.CREATED,
  BOARD_NOTIFICATION_EVENT.DELETED,
  BOARD_NOTIFICATION_EVENT.RESTORED,
];

const LEADERSHIP_ROLES: string[] = [ROLES.OWNER, ROLES.ADMISSION_MANAGER];

const MODULE_LISTS: Record<string, string> = {
  LEAD: "master-list",
  REFERRAL: "referral-list",
  CONTACT: "contacts",
  COMPANY: "companies",
};

@Injectable()
export class BoardNotifyService {
  private readonly logger = new Logger(BoardNotifyService.name);

  constructor(private readonly notificationService: NotificationService) {}

  // Custom modules have no dedicated route, so they fall back to the generic
  // records path the way the sidebar does rather than to the organization root.
  private listLink(moduleType: string, organizationId: string) {
    const segment = MODULE_LISTS[moduleType] ?? `records/${moduleType}`;
    return `/${organizationId}/${segment}`;
  }

  // Only LEAD has a record detail route, so the rest deep link to their list.
  private recordLink(
    moduleType: string,
    organizationId: string,
    recordId: string
  ) {
    return moduleType === "LEAD"
      ? `/${organizationId}/master-list/leads/${recordId}/timeline`
      : this.listLink(moduleType, organizationId);
  }

  // Never throws: a board mutation must not fail because a notice could not be raised.
  async notifyRecord(input: BoardNotifyInput) {
    try {
      const record = await prisma.board.findFirst({
        where: { id: input.recordId, organizationId: input.organizationId },
        select: { assignedTo: true, recordName: true },
      });

      if (!record) return;

      const wantsLeadership = LEADERSHIP_EVENTS.includes(input.event);

      const members = await prisma.member.findMany({
        where: {
          organizationId: input.organizationId,
          OR: [
            ...(record.assignedTo ? [{ userId: record.assignedTo }] : []),
            ...(wantsLeadership ? [{ role: { in: LEADERSHIP_ROLES } }] : []),
          ],
        },
        select: { id: true },
      });

      const recipientMemberIds = members.map((member) => member.id);
      if (!recipientMemberIds.length) return;

      await this.notificationService.notify({
        organizationId: input.organizationId,
        recipientMemberIds,
        actorUserId: input.actorUserId ?? null,
        type: boardNotificationType(input.moduleType, input.event),
        title: input.title(record.recordName),
        body: input.body ?? null,
        link: this.recordLink(
          input.moduleType,
          input.organizationId,
          input.recordId
        ),
        entityType: input.moduleType,
        entityId: input.recordId,
      });
    } catch (error) {
      this.logger.error(
        `Board notification failed for ${input.recordId} (${input.event})`,
        error as Error
      );
    }
  }

  // Job outcomes go back to the person who started them, not to the assignees.
  async notifyActor(input: {
    organizationId: string;
    moduleType: string;
    event: BoardNotificationEvent;
    actorUserId: string;
    title: string;
    body?: string | null;
  }) {
    try {
      const member = await prisma.member.findFirst({
        where: {
          userId: input.actorUserId,
          organizationId: input.organizationId,
        },
        select: { id: true },
      });

      if (!member) return;

      await this.notificationService.notify({
        organizationId: input.organizationId,
        recipientMemberIds: [member.id],
        type: boardNotificationType(input.moduleType, input.event),
        title: input.title,
        body: input.body ?? null,
        link: this.listLink(input.moduleType, input.organizationId),
      });
    } catch (error) {
      this.logger.error(
        `Board job notification failed (${input.event})`,
        error as Error
      );
    }
  }
}
