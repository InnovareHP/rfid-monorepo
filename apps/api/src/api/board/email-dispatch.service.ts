import { Injectable } from "@nestjs/common";
import { render } from "@react-email/render";
import { sanitizeRichText } from "@dashboard/shared";
import { appConfig } from "../../config/app-config";
import { sendEmail } from "../../lib/aws/ses";
import { ActivityEmail } from "../../react-email/activity-email";
import { EmailTrackingService } from "../email/email-tracking.service";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

export interface DispatchInput {
  userId: string;
  to: string;
  subject: string;
  recipientName: string;
  body: string;
  senderName: string;
  sendVia?: string;
  sender?: DispatchSender;
  // Required, not defaulted: a blast body is already a complete email document
  // and must ship as-is, so every caller states which one it is.
  layout: "ACTIVITY" | "NONE";
}

// A campaign's chosen identity. A verified domain sends through SES as that
// domain; a personal one pins the mailbox chain to whoever connected it.
export interface DispatchSender {
  kind: "PERSONAL" | "CUSTOM_DOMAIN";
  fromEmail: string;
  fromName: string | null;
  replyTo: string | null;
  mailboxUserId: string | null;
}

export interface DispatchResult {
  senderEmail: string;
  trackingId: string;
}

@Injectable()
export class EmailDispatchService {
  constructor(
    private readonly gmailService: GmailService,
    private readonly outlookService: OutlookService,
    private readonly trackingService: EmailTrackingService
  ) {}

  // Renders once, stamps the pixel and thread id, then Gmail -> Outlook -> SES.
  async send(input: DispatchInput): Promise<DispatchResult> {
    const trackingId = this.trackingService.newTrackingId();
    const references = this.trackingService.threadReference(trackingId);

    const document =
      input.layout === "NONE"
        ? input.body
        : await render(
            ActivityEmail({
              recipientName: input.recipientName,
              body: sanitizeRichText(input.body),
            })
          );

    const html = this.trackingService.injectPixel(document, trackingId);

    const senderEmail = await this.deliver(input, html, references);

    return { senderEmail, trackingId };
  }

  private async deliver(
    input: DispatchInput,
    html: string,
    references: string | null
  ): Promise<string> {
    const { to, subject, senderName, sendVia, sender } = input;
    // A personal identity sends from its own mailbox, not the requester's.
    const userId = sender?.mailboxUserId ?? input.userId;

    // A domain identity skips the OAuth chain entirely: the whole point is that
    // the mail leaves as the organization, not as a person's inbox. Nothing
    // receives at that domain, so Reply-To carries replies to a real inbox.
    if (sender && sender.kind !== "PERSONAL") {
      await sendEmail({
        to,
        subject,
        html,
        from: sender.fromName
          ? `${sender.fromName} <${sender.fromEmail}>`
          : sender.fromEmail,
        replyTo: sender.replyTo ?? undefined,
        references,
      });

      return sender.fromEmail;
    }

    const tryGmail = async () => {
      const sent = await this.gmailService.trySendViaGmail(
        userId,
        to,
        subject,
        html,
        senderName,
        references
      );
      if (!sent) return null;
      const status = await this.gmailService.getConnectionStatus(userId);
      return status.email;
    };

    const tryOutlook = async () => {
      const sent = await this.outlookService.trySendViaOutlook(
        userId,
        to,
        subject,
        html,
        references
      );
      if (!sent) return null;
      const status = await this.outlookService.getConnectionStatus(userId);
      return status.email;
    };

    if (sendVia === "GMAIL") {
      const email = await tryGmail();
      if (email) return email;
    } else if (sendVia === "OUTLOOK") {
      const email = await tryOutlook();
      if (email) return email;
    } else {
      const gmailEmail = await tryGmail();
      if (gmailEmail) return gmailEmail;

      const outlookEmail = await tryOutlook();
      if (outlookEmail) return outlookEmail;
    }

    await sendEmail({
      to,
      subject,
      html,
      from: appConfig.APP_EMAIL,
      references,
    });

    return appConfig.APP_EMAIL;
  }
}
