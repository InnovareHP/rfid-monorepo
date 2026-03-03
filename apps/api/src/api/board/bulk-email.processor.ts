import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { appConfig } from "src/config/app-config";
import { prisma } from "src/lib/prisma/prisma";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { sendEmail } from "../../lib/resend/resend";
import { ActivityEmail } from "../../react-email/activity-email";
import { BoardGateway } from "./board.gateway";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

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
    private readonly gmailService: GmailService,
    private readonly outlookService: OutlookService
  ) {
    super();
  }

  async process(job: Job<BulkEmailJobData>) {
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

    const emailField = await prisma.field.findFirst({
      where: {
        organizationId: organizationId,
        moduleType: moduleType,
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
        moduleType: moduleType,
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
        const senderEmail = await this.sendEmailWithProvider(
          userId,
          recipientEmail,
          emailSubject,
          record.recordName,
          emailBody,
          creator.name,
          sendVia
        );

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
            recordId: record.id,
            createdBy: userId,
            organizationId: organizationId,
          },
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

    return result;
  }

  private async sendEmailWithProvider(
    userId: string,
    to: string,
    subject: string,
    recipientName: string,
    body: string,
    senderName: string,
    sendVia?: string
  ): Promise<string> {
    const gmailStatus = await this.gmailService.getConnectionStatus(userId);
    const outlookStatus = await this.outlookService.getConnectionStatus(userId);

    if (sendVia === "GMAIL") {
      const sent = await this.gmailService.trySendViaGmail(
        userId,
        to,
        subject,
        recipientName,
        body,
        senderName
      );
      if (sent && gmailStatus.email) return gmailStatus.email;
      await sendEmail({
        to,
        subject,
        html: ActivityEmail({ recipientName, body }),
        from: appConfig.APP_EMAIL,
      });
      return appConfig.APP_EMAIL;
    }

    if (sendVia === "OUTLOOK") {
      const sent = await this.outlookService.trySendViaOutlook(
        userId,
        to,
        subject,
        recipientName,
        body,
        senderName
      );
      if (sent && outlookStatus.email) return outlookStatus.email;
      await sendEmail({
        to,
        subject,
        html: ActivityEmail({ recipientName, body }),
        from: appConfig.APP_EMAIL,
      });
      return appConfig.APP_EMAIL;
    }

    // AUTO: Gmail → Outlook → Resend
    const sentViaGmail = await this.gmailService.trySendViaGmail(
      userId,
      to,
      subject,
      recipientName,
      body,
      senderName
    );
    if (sentViaGmail && gmailStatus.email) return gmailStatus.email;

    const sentViaOutlook = await this.outlookService.trySendViaOutlook(
      userId,
      to,
      subject,
      recipientName,
      body,
      senderName
    );
    if (sentViaOutlook && outlookStatus.email) return outlookStatus.email;

    await sendEmail({
      to,
      subject,
      html: ActivityEmail({ recipientName, body }),
      from: appConfig.APP_EMAIL,
    });
    return appConfig.APP_EMAIL;
  }
}
