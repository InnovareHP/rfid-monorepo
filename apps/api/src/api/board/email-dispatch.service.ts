import { GetObjectCommand } from "@aws-sdk/client-s3";
import { BadRequestException, Injectable } from "@nestjs/common";
import { render } from "@react-email/render";
import { applyMergeVariables, sanitizeRichText } from "@dashboard/shared";
import { appConfig } from "../../config/app-config";
import { SesAttachment, sendEmail } from "../../lib/aws/ses";
import { prisma } from "../../lib/prisma/prisma";
import { s3 } from "../../lib/s3/s3";
import { ActivityEmail } from "../../react-email/activity-email";
import { EmailBranding } from "../../react-email/email-layout";
import { EmailTrackingService } from "../email/email-tracking.service";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

interface DispatchBase {
  userId: string;
  to: string;
  subject: string;
  recipientName: string;
  body: string;
  senderName: string;
  sendVia?: string;
  sender?: DispatchSender;
  attachments?: SesAttachment[];
}

// A file the composer uploaded; the key must sit under the org's private prefix.
export interface AttachmentRef {
  key: string;
  name: string;
}

// Reads the encrypted-at-rest column back into refs; null means no files.
export const parseAttachments = (stored: string | null): AttachmentRef[] =>
  stored ? (JSON.parse(stored) as AttachmentRef[]) : [];

// Blast attachments are a plain JSON column rather than encrypted text.
export const blastAttachments = (stored: unknown): AttachmentRef[] =>
  (stored as AttachmentRef[] | null) ?? [];

// Gmail caps a message at 25MB and base64 inflates by a third.
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

// Required, not defaulted: a blast body is already a complete email document
// and must ship as-is, so every caller states which one it is.
export type DispatchInput = DispatchBase &
  ({ layout: "NONE" } | { layout: "ACTIVITY"; organizationId: string });

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

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
        : await this.renderActivity(input, input.organizationId);

    const html = this.trackingService.injectPixel(document, trackingId);

    const senderEmail = await this.deliver(input, html, references);

    return { senderEmail, trackingId };
  }

  // Rejects keys outside this org so a caller cannot mail another tenant's files.
  assertOwnedAttachments(refs: AttachmentRef[], organizationId: string) {
    const prefix = `private/${organizationId}/`;
    if (refs.some((ref) => !ref.key.startsWith(prefix))) {
      throw new BadRequestException(
        "Attachment does not belong to this organization"
      );
    }
  }

  // Loaded once per send batch; bulk callers reuse the buffers for every recipient.
  async loadAttachments(
    refs: AttachmentRef[],
    organizationId: string
  ): Promise<SesAttachment[]> {
    this.assertOwnedAttachments(refs, organizationId);

    const files = await Promise.all(
      refs.map(async (ref) => {
        const object = await s3.send(
          new GetObjectCommand({
            Bucket: appConfig.S3_UPLOADS_BUCKET,
            Key: ref.key,
          })
        );
        return {
          filename: ref.name,
          content: Buffer.from(await object.Body!.transformToByteArray()),
          contentType: object.ContentType,
        };
      })
    );

    const total = files.reduce((sum, file) => sum + file.content.length, 0);
    if (total > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException("Attachments exceed 15MB in total");
    }

    return files;
  }

  private async renderActivity(input: DispatchBase, organizationId: string) {
    const branding = await this.loadBranding(organizationId);
    const body = applyMergeVariables(sanitizeRichText(input.body), {
      recordName: input.recipientName,
      email: input.to,
      organizationName: branding.name,
    });

    return render(ActivityEmail({ preview: input.subject, body, branding }));
  }

  // Metadata is free-form JSON the org edits, so only a valid hex survives.
  private async loadBranding(organizationId: string): Promise<EmailBranding> {
    const organization = await prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true, logo: true, metadata: true },
    });

    const color = this.parseBrandColor(organization.metadata);
    const logoUrl = organization.logo?.startsWith("https://")
      ? organization.logo
      : null;

    return { name: organization.name, logoUrl, color };
  }

  private parseBrandColor(metadata: string | null): string | null {
    if (!metadata) return null;
    try {
      const { brandColor } = JSON.parse(metadata) as { brandColor?: unknown };
      return typeof brandColor === "string" && HEX_COLOR.test(brandColor)
        ? brandColor
        : null;
    } catch {
      return null;
    }
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
        attachments: input.attachments,
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
        references,
        input.attachments
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
        references,
        input.attachments
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
      attachments: input.attachments,
    });

    return appConfig.APP_EMAIL;
  }
}
