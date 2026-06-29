import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { appConfig } from "../../config/app-config";
import { sendEmail } from "../../lib/aws/ses";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { SendEmailDto } from "./dto/email.schema";

@Injectable()
export class EmailService {
  constructor(
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue
  ) {}

  async queueEmail(data: {
    to: string;
    subject: string;
    html: string;
    from: string;
  }) {
    await this.emailQueue.add("send", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
  }

  async sendEmail(sendEmailDto: SendEmailDto) {
    const { to, subject, html } = sendEmailDto;
    return sendEmail({
      from: appConfig.APP_EMAIL,
      to,
      subject,
      html,
    });
  }
}
