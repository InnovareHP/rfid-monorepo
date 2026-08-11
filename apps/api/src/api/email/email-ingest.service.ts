import { BOARD_NOTIFICATION_EVENT } from "@dashboard/shared";
import { Injectable, Logger } from "@nestjs/common";
import { randomBytes } from "crypto";
import { appConfig } from "../../config/app-config";
import { AuditService } from "../../lib/audit/audit.service";
import { prisma } from "../../lib/prisma/prisma";
import { runUnscoped, runWithTenant } from "../../lib/prisma/tenant-context";
import { BoardNotifyService } from "../board/board-notify.service";

export interface ParsedInboundEmail {
  from: string;
  fromName: string | null;
  recipients: string[];
  subject: string;
  text: string;
  messageId: string | null;
  inReplyTo: string | null;
  references: string[];
}

// Synthetic id stamped into References on outbound mail.
const THREAD_TOKEN_PATTERN = /a\.([0-9a-f]{32})@/i;

@Injectable()
export class EmailIngestService {
  private readonly logger = new Logger(EmailIngestService.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly boardNotify: BoardNotifyService
  ) {}

  // Null when inbound ingest is not set up: outbound sending does not need it.
  async getIngestAddress(organizationId: string): Promise<string | null> {
    if (!appConfig.EMAIL_INGEST_DOMAIN) return null;

    const existing = await prisma.emailIngestAddress.findUnique({
      where: { organizationId },
      select: { ingestKey: true },
    });

    const ingestKey =
      existing?.ingestKey ??
      (
        await prisma.emailIngestAddress.create({
          data: { organizationId, ingestKey: randomBytes(9).toString("hex") },
          select: { ingestKey: true },
        })
      ).ingestKey;

    return `${ingestKey}@${appConfig.EMAIL_INGEST_DOMAIN}`;
  }

  // Resolves which org an inbound message belongs to from its recipient list.
  private async resolveOrganization(
    recipients: string[]
  ): Promise<string | null> {
    const domain = appConfig.EMAIL_INGEST_DOMAIN?.toLowerCase();
    if (!domain) return null;

    const keys = recipients
      .map((address) => address.toLowerCase().trim())
      .filter((address) => address.endsWith(`@${domain}`))
      .map((address) => address.split("@")[0]);

    if (keys.length === 0) return null;

    const match = await prisma.emailIngestAddress.findFirst({
      where: { ingestKey: { in: keys } },
      select: { organizationId: true },
    });

    return match?.organizationId ?? null;
  }

  // Match 1: our synthetic thread token echoed back in References or In-Reply-To.
  private async matchByThreadToken(
    email: ParsedInboundEmail,
    organizationId: string
  ) {
    const headers = [email.inReplyTo ?? "", ...email.references].join(" ");
    const token = headers.match(THREAD_TOKEN_PATTERN)?.[1];

    if (!token) return null;

    return prisma.activity.findFirst({
      where: { trackingId: token, organizationId },
      select: { id: true, recordId: true, threadToken: true },
    });
  }

  // Match 2: sender address against an EMAIL field value on a record in this org.
  // Values are encrypted at rest, so comparison happens in app after decryption.
  private async matchRecordBySender(
    fromAddress: string,
    organizationId: string
  ): Promise<string | null> {
    const emailFields = await prisma.field.findMany({
      where: { organizationId, fieldType: "EMAIL", isDeleted: false },
      select: { id: true },
    });

    if (emailFields.length === 0) return null;

    const values = await prisma.fieldValue.findMany({
      where: {
        fieldId: { in: emailFields.map((field) => field.id) },
        record: { organizationId, isDeleted: false },
      },
      select: { recordId: true, value: true },
    });

    const target = fromAddress.toLowerCase().trim();
    const hit = values.find(
      (entry) => entry.value?.toLowerCase().trim() === target
    );

    return hit?.recordId ?? null;
  }

  private async resolveCreator(
    recordId: string,
    organizationId: string
  ): Promise<string | null> {
    const record = await prisma.board.findUnique({
      where: { id: recordId },
      select: { assignedTo: true },
    });

    if (record?.assignedTo) return record.assignedTo;

    const owner = await prisma.member.findFirst({
      where: { organizationId, role: "owner" },
      select: { userId: true },
    });

    return owner?.userId ?? null;
  }

  // Returns true when the message was logged, false when it was discarded unstored.
  async ingest(email: ParsedInboundEmail): Promise<boolean> {
    // The recipient key is the only tenant hint an inbound message carries, so
    // that one lookup runs unscoped and everything after it is scoped to the hit.
    const organizationId = await runUnscoped(() =>
      this.resolveOrganization(email.recipients)
    );

    if (!organizationId) {
      this.logger.warn(
        "Inbound email had no matching ingest address, discarded"
      );
      return false;
    }

    return runWithTenant(organizationId, () =>
      this.ingestForOrganization(email, organizationId)
    );
  }

  private async ingestForOrganization(
    email: ParsedInboundEmail,
    organizationId: string
  ): Promise<boolean> {
    const parent = await this.matchByThreadToken(email, organizationId);
    const recordId =
      parent?.recordId ??
      (await this.matchRecordBySender(email.from, organizationId));

    if (!recordId) {
      this.logger.warn("Inbound email matched no record, discarded");
      return false;
    }

    if (email.messageId) {
      const duplicate = await prisma.activity.findFirst({
        where: { organizationId, messageId: email.messageId },
        select: { id: true },
      });
      if (duplicate) return true;
    }

    const createdBy = await this.resolveCreator(recordId, organizationId);

    if (!createdBy) {
      this.logger.error(
        `No owner to attribute inbound email for org ${organizationId}, discarded`
      );
      return false;
    }

    const activity = await prisma.activity.create({
      data: {
        title: email.subject || "(no subject)",
        activityType: "EMAIL",
        status: "COMPLETED",
        completedAt: new Date(),
        direction: "INBOUND",
        senderEmail: email.from,
        emailSubject: email.subject,
        emailBody: email.text,
        emailSentAt: new Date(),
        messageId: email.messageId,
        threadToken: parent?.threadToken ?? null,
        recordId,
        createdBy,
        organizationId,
      },
      select: { id: true },
    });

    await this.auditService.record({
      actorOrgId: organizationId,
      action: "email.inbound.ingest",
      resourceType: "Activity",
      resourceId: activity.id,
      metadata: { matchedBy: parent ? "thread-token" : "sender-address" },
    });

    const record = await prisma.board.findFirst({
      where: { id: recordId, organizationId },
      select: { moduleType: true },
    });

    if (record) {
      await this.boardNotify.notifyRecord({
        recordId,
        organizationId,
        moduleType: record.moduleType,
        event: BOARD_NOTIFICATION_EVENT.EMAIL_RECEIVED,
        title: (recordName) => `Reply received from ${recordName}`,
      });
    }

    return true;
  }
}
