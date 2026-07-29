import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { prisma } from "../../../lib/prisma/prisma";
import { BoardGateway } from "../../board/board.gateway";
import { EmailDispatchService } from "../../board/email-dispatch.service";
import { QUEUE_NAMES } from "../../../lib/queue/queue.constants";

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
    private readonly emailDispatchService: EmailDispatchService
  ) {
    super();
  }

  async process(job: Job<BlastSendJobData>) {
    const { blastId, organizationId, userId, sendVia } = job.data;

    const blast = await prisma.blast.findUniqueOrThrow({
      where: { id: blastId },
    });
    const creator = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const pending = await prisma.blastRecipient.findMany({
      where: { blastId, status: "PENDING" },
      include: { record: { select: { recordName: true } } },
    });

    let sent = 0;
    let failed = 0;

    for (const recipient of pending) {
      try {
        const { trackingId } = await this.emailDispatchService.send({
          userId,
          to: recipient.email,
          subject: blast.subject,
          recipientName: recipient.record.recordName,
          body: blast.bodyHtml,
          senderName: creator.name,
          sendVia,
        });

        await prisma.$transaction([
          prisma.blastRecipient.update({
            where: { id: recipient.id },
            data: { status: "SENT", trackingId, sentAt: new Date() },
          }),
          prisma.activity.create({
            data: {
              title: blast.subject,
              description: blast.bodyHtml,
              activityType: "EMAIL",
              status: "COMPLETED",
              completedAt: new Date(),
              recipientEmail: recipient.email,
              emailSubject: blast.subject,
              emailBody: blast.bodyHtml,
              emailSentAt: new Date(),
              trackingId,
              threadToken: trackingId,
              recordId: recipient.recordId,
              createdBy: userId,
              organizationId,
            },
          }),
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
