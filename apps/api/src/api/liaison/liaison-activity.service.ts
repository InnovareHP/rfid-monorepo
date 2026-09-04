import { ROLES } from "@dashboard/shared";
import { Injectable, Logger } from "@nestjs/common";
import { ActivityType, TouchpointType } from "@prisma/client";
import { prisma } from "../../lib/prisma/prisma";

type RecordActivityLog = {
  recordId: string;
  organizationId: string;
  userId: string;
  activityType: ActivityType;
  isBulkSend?: boolean;
};

const ACTIVITY_TOUCHPOINTS: Record<ActivityType, TouchpointType> = {
  CALL: TouchpointType.PHONE,
  EMAIL: TouchpointType.EMAIL,
  MEETING: TouchpointType.IN_PERSON_MEETING,
  TEXT: TouchpointType.TEXT,
  LINKED_IN: TouchpointType.LINKED_IN,
  FACEBOOK: TouchpointType.FACEBOOK,
  // A note is not a channel and a fax has no touchpoint of its own, so both
  // land on OTHER rather than inventing one.
  NOTE: TouchpointType.OTHER,
  FAX: TouchpointType.OTHER,
  OTHER: TouchpointType.OTHER,
};

// Reverse of ACTIVITY_TOUCHPOINTS, used to mirror a marketing log back onto the board.
export const TOUCHPOINT_ACTIVITIES: Record<TouchpointType, ActivityType> = {
  PHONE: ActivityType.CALL,
  EMAIL: ActivityType.EMAIL,
  IN_PERSON_MEETING: ActivityType.MEETING,
  TEXT: ActivityType.TEXT,
  LINKED_IN: ActivityType.LINKED_IN,
  FACEBOOK: ActivityType.FACEBOOK,
  OTHER: ActivityType.OTHER,
  // The only lossy pair left, and deliberately so: a blast is one send to many
  // records, and the board activity for it is an email.
  EMAIL_BLAST: ActivityType.EMAIL,
};

@Injectable()
export class LiaisonActivityService {
  private readonly logger = new Logger(LiaisonActivityService.name);

  // Mirrors an action taken on a record into the liaison marketing log, so a
  // touchpoint a liaison made through the board does not have to be re-entered
  // by hand. Never throws: the action itself already succeeded.
  async logRecordActivity(input: RecordActivityLog) {
    try {
      const member = await prisma.member.findFirst({
        where: { userId: input.userId, organizationId: input.organizationId },
        select: { id: true, role: true },
      });

      if (member?.role !== ROLES.LIAISON) return;

      const record = await prisma.board.findFirst({
        where: { id: input.recordId, organizationId: input.organizationId },
        select: { recordName: true, moduleType: true },
      });

      if (!record) return;

      const touchpoint = input.isBulkSend
        ? TouchpointType.EMAIL_BLAST
        : ACTIVITY_TOUCHPOINTS[input.activityType];

      // Facilities are LEAD-type records only; skip the FK for REFERRAL/CONTACT/COMPANY
      // records so facility-scoped aggregation is never corrupted.
      const facilityRecordId =
        record.moduleType === "LEAD" ? input.recordId : null;

      // Marketing rows are not encrypted at rest and facility is matched with a
      // SQL contains, so nothing beyond the record name is copied in here.
      await prisma.$transaction(async (tx) => {
        await tx.marketing.create({
          data: {
            facility: record.recordName,
            touchpoints: [touchpoint],
            talkedTo: record.recordName,
            notes: `Auto-logged from a ${input.activityType} activity on the board`,
            memberId: member.id,
            userId: input.userId,
            organizationId: input.organizationId,
            facilityRecordId,
          },
        });

        await tx.history.create({
          data: {
            recordId: input.recordId,
            column: "marketing",
            newValue: `Auto-logged a ${touchpoint} touchpoint`,
            action: "milestone_created",
            createdBy: input.userId,
            organizationId: input.organizationId,
          },
        });
      });
    } catch (error) {
      this.logger.error(
        `Liaison touchpoint log failed for ${input.recordId}`,
        error as Error
      );
    }
  }
}
