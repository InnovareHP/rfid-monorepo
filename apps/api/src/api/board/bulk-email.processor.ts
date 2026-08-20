import { BOARD_NOTIFICATION_EVENT } from "@dashboard/shared";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { prisma } from "src/lib/prisma/prisma";
import { resolveModuleId } from "src/lib/module/system-modules";
import { runWithTenant } from "src/lib/prisma/tenant-context";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { LiaisonActivityService } from "../liaison/liaison-activity.service";
import { BoardNotifyService } from "./board-notify.service";
import { BoardGateway } from "./board.gateway";
import { EmailDispatchService } from "./email-dispatch.service";

export interface BulkEmailJobData {
  recordIds: string[];
  emailSubject: string;
  emailBody: string;
  organizationId: string;
  userId: string;
  moduleType: string;
  sendVia?: string;
}

@Processor(QUEUE_NAMES.BULK_EMAIL)
export class BulkEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkEmailProcessor.name);

  constructor(
    private readonly boardGateway: BoardGateway,
    private readonly emailDispatchService: EmailDispatchService,
    private readonly boardNotify: BoardNotifyService,
    private readonly liaisonActivity: LiaisonActivityService
  ) {
    super();
  }

  // Jobs run outside a request, so the payload organization opens the tenant store.
  async process(job: Job<BulkEmailJobData>) {
    return runWithTenant(job.data.organizationId, () => this.handle(job));
  }

  private async handle(job: Job<BulkEmailJobData>) {
    const {
      recordIds,
      emailSubject,
      emailBody,
      organizationId,
      userId,
      moduleType,
      sendVia,
    } = job.data;

    this.logger.log(
      `Processing bulk email job ${job.id} — ${recordIds.length} records`
    );

    const scopedModuleId = await resolveModuleId(moduleType);

    const emailField = await prisma.field.findFirst({
      where: {
        organizationId: organizationId,
        moduleId: scopedModuleId,
        fieldType: "EMAIL",
      },
      select: { id: true },
    });

    if (!emailField) {
      throw new Error("No EMAIL field found for this organization");
    }

    const records = await prisma.board.findMany({
      where: {
        id: { in: recordIds },
        organizationId: organizationId,
        moduleId: scopedModuleId,
        isDeleted: false,
      },
      select: {
        id: true,
        recordName: true,
        values: {
          where: { fieldId: emailField.id },
          select: { value: true },
        },
      },
    });

    const creator = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true },
    });

    let sent = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
      const recipientEmail = record.values[0]?.value;

      if (!recipientEmail) {
        skipped++;
        continue;
      }

      try {
        const { senderEmail, trackingId } =
          await this.emailDispatchService.send({
            userId,
            to: recipientEmail,
            subject: emailSubject,
            recipientName: record.recordName,
            body: emailBody,
            layout: "ACTIVITY",
            senderName: creator.name,
            sendVia,
          });

        await prisma.activity.create({
          data: {
            title: emailSubject,
            description: emailBody,
            activityType: "EMAIL",
            status: "COMPLETED",
            completedAt: new Date(),
            recipientEmail: recipientEmail,
            emailSubject: emailSubject,
            emailBody: emailBody,
            emailSentAt: new Date(),
            senderEmail: senderEmail,
            trackingId: trackingId,
            threadToken: trackingId,
            recordId: record.id,
            createdBy: userId,
            organizationId: organizationId,
          },
        });

        await this.liaisonActivity.logRecordActivity({
          recordId: record.id,
          organizationId,
          userId,
          activityType: "EMAIL",
        });

        sent++;
      } catch (error) {
        this.logger.error(
          `Failed to send email to ${recipientEmail}: ${error.message}`
        );
        errors++;
      }

      await job.updateProgress({
        sent,
        skipped,
        errors,
        total: records.length,
      });
    }

    skipped += recordIds.length - records.length;

    const result = { sent, skipped, errors };

    this.boardGateway.server
      .to(`org:${organizationId}`)
      .emit("board:bulk-email-complete", { jobId: job.id, ...result });

    await this.boardNotify.notifyActor({
      organizationId,
      moduleType,
      actorUserId: userId,
      event: BOARD_NOTIFICATION_EVENT.BULK_EMAIL_FINISHED,
      title: `Bulk email finished — ${sent} sent`,
      body: `${skipped} skipped, ${errors} failed`,
    });

    return result;
  }
}
