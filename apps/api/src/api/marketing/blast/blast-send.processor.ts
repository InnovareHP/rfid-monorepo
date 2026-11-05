import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { prisma } from "../../../lib/prisma/prisma";
import { runWithTenant } from "../../../lib/prisma/tenant-context";
import { BoardGateway } from "../../board/board.gateway";
import { EmailDispatchService } from "../../board/email-dispatch.service";
import { SenderService } from "../sender/sender.service";
import { SubscriberService } from "../subscriber/subscriber.service";
import { QUEUE_NAMES } from "../../../lib/queue/queue.constants";
import { applyMergeVariables, wrapClassicHtml } from "./blast-html";

export interface BlastSendJobData {
  blastId: string;
  organizationId: string;
  userId: string;
  sendVia?: string;
}

@Processor(QUEUE_NAMES.BLAST_SEND, { concurrency: 1 })
export class BlastSendProcessor extends WorkerHost {
  private readonly logger = new Logger(BlastSendProcessor.name);

  constructor(
    private readonly boardGateway: BoardGateway,
    private readonly emailDispatchService: EmailDispatchService,
    private readonly senderService: SenderService,
    private readonly subscriberService: SubscriberService
  ) {
    super();
  }

  // Jobs run outside a request, so the payload organization opens the tenant store.
  async process(job: Job<BlastSendJobData>) {
    return runWithTenant(job.data.organizationId, () => this.handle(job));
  }

  private async handle(job: Job<BlastSendJobData>) {
    const { blastId, organizationId, userId, sendVia } = job.data;

    const blast = await prisma.blast.findUniqueOrThrow({
      where: { id: blastId },
    });
    const creator = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true },
    });

    // Resolved once for the whole run, and it throws if the campaign's domain
    // is no longer verified, so a bad identity fails before any mail goes out.
    const sender = blast.campaignId
      ? await this.senderService.resolveForCampaign(
          blast.campaignId,
          organizationId
        )
      : null;

    // A classic body is stored without the email shell, so the footer that
    // carries the unsubscribe link is wrapped on here.
    const documentHtml =
      blast.editorType === "CLASSIC"
        ? wrapClassicHtml(blast.bodyHtml, organization.name)
        : blast.bodyHtml;

    const pending = await prisma.blastRecipient.findMany({
      where: { blastId, status: "PENDING" },
      include: {
        record: { select: { recordName: true } },
        subscriber: { select: { name: true } },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const recipient of pending) {
      try {
        const recipientName =
          recipient.record?.recordName ??
          recipient.subscriber?.name ??
          recipient.email;

        // Merge tokens resolve per recipient, so the body is rendered here.
        const body = applyMergeVariables(documentHtml, {
          recordName: recipientName,
          email: recipient.email,
          organizationName: organization.name,
          unsubscribeUrl: this.subscriberService.unsubscribeUrl(
            organizationId,
            recipient.email
          ),
          subscribeUrl: this.subscriberService.subscribeUrl(organizationId),
        });

        const { trackingId } = await this.emailDispatchService.send({
          userId,
          to: recipient.email,
          subject: blast.subject,
          recipientName,
          body,
          layout: "NONE",
          senderName: sender?.fromName ?? creator.name,
          sendVia,
          sender: sender
            ? {
                kind: sender.kind,
                fromEmail: sender.fromEmail,
                fromName: sender.fromName,
                replyTo: sender.replyTo,
                mailboxUserId: sender.mailboxUserId,
              }
            : undefined,
        });

        // An activity hangs off a CRM record's timeline. A newsletter
        // subscriber has no record, so there is nothing to append to.
        const recordId = recipient.recordId;

        await prisma.$transaction([
          prisma.blastRecipient.update({
            where: { id: recipient.id },
            data: { status: "SENT", trackingId, sentAt: new Date() },
          }),
          ...(recordId
            ? [
                prisma.activity.create({
                  data: {
                    title: blast.subject,
                    description: body,
                    activityType: "EMAIL",
                    status: "COMPLETED",
                    completedAt: new Date(),
                    recipientEmail: recipient.email,
                    emailSubject: blast.subject,
                    emailBody: body,
                    emailSentAt: new Date(),
                    trackingId,
                    threadToken: trackingId,
                    recordId,
                    createdBy: userId,
                    organizationId,
                  },
                }),
              ]
            : []),
        ]);
        sent++;
      } catch (error) {
        this.logger.error(
          `Failed to send blast email to ${recipient.email}: ${error.message}`
        );
        await prisma.blastRecipient.update({
          where: { id: recipient.id },
          data: { status: "FAILED", error: error.message },
        });
        failed++;
      }
      await job.updateProgress({ sent, failed, total: pending.length });
    }

    const status =
      failed === pending.length && pending.length > 0 ? "FAILED" : "SENT";
    await prisma.blast.update({
      where: { id: blastId },
      data: { status, sentAt: new Date() },
    });

    const result = { sent, failed, total: pending.length };

    this.boardGateway.server
      .to(`org:${organizationId}`)
      .emit("marketing:blast-send-complete", {
        jobId: job.id,
        blastId,
        ...result,
      });

    return result;
  }
}
