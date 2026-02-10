import { Injectable } from "@nestjs/common";
import { appConfig } from "../../config/app-config";
import { resend } from "../../lib/resend/resend";
import { SendEmailDto } from "./dto/email.schema";

@Injectable()
export class EmailService {
  constructor() {}

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
