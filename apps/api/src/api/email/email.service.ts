import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import { appConfig } from "../../config/app-config";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { resend } from "../../lib/resend/resend";
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

    await resend.emails.send({
      from: `${appConfig.APP_EMAIL}`,
      to: to,
      subject: subject,
      html: html,
    });

    return {
      message: "Email sent successfully",
    };
  }
}
