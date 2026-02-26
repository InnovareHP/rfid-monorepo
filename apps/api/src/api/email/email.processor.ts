import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { resend } from "../../lib/resend/resend";

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  from: string;
}

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData>) {
    this.logger.log(`Processing email job ${job.id} → ${job.data.to}`);
    await resend.emails.send({
      from: job.data.from,
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
    });
  }
}
