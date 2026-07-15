import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { render } from "@react-email/render";
import { appConfig } from "../../config/app-config";

const ses = new SESv2Client({
  region: appConfig.AWS_REGION,
  ...(appConfig.AWS_ACCESS_KEY_ID && appConfig.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: appConfig.AWS_ACCESS_KEY_ID,
          secretAccessKey: appConfig.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

export const renderEmailHtml = async (
  reactNode: React.ReactNode
): Promise<string> => {
  return render(reactNode);
};

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: React.ReactNode | string;
  from?: string;
  replyTo?: string;
  attachments?: SesAttachment[];
}

export type SesAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

function asArray(v: string | string[]): string[] {
  return Array.isArray(v) ? v : [v];
}

async function htmlString(html: React.ReactNode | string): Promise<string> {
  return typeof html === "string" ? html : await render(html);
}

function escapeHeader(value: string): string {
  // Strip CR/LF to defeat header injection.
  return value.replace(/[\r\n]+/g, " ").trim();
}

function stripTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// RFC 2045 caps MIME lines at ~1000 chars — fold base64 bodies at 76.
function base64Lines(data: Buffer | string): string {
  const b64 =
    typeof data === "string"
      ? Buffer.from(data, "utf8").toString("base64")
      : data.toString("base64");
  return b64.replace(/(.{76})/g, "$1\r\n");
}

function buildRawMime(params: {
  from: string;
  to: string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: SesAttachment[];
}): Buffer {
  const uid = `${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;
  const mixedBoundary = `mixed_${uid}`;
  const altBoundary = `alt_${uid}`;

  const headers: string[] = [
    `From: ${escapeHeader(params.from)}`,
    `To: ${escapeHeader(params.to.join(", "))}`,
    `Subject: ${escapeHeader(params.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
  ];
  if (params.replyTo) headers.push(`Reply-To: ${escapeHeader(params.replyTo)}`);

  const alternative = [
    `--${altBoundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(stripTags(params.html)),
    `--${altBoundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(params.html),
    `--${altBoundary}--`,
  ].join("\r\n");

  const sections: string[] = [
    headers.join("\r\n"),
    "",
    `--${mixedBoundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    "",
    alternative,
  ];

  for (const attachment of params.attachments ?? []) {
    const filename = escapeHeader(attachment.filename).replace(/"/g, "'");
    const contentType = attachment.contentType ?? "application/octet-stream";
    sections.push(
      `--${mixedBoundary}`,
      `Content-Type: ${contentType}; name="${filename}"`,
      `Content-Disposition: attachment; filename="${filename}"`,
      "Content-Transfer-Encoding: base64",
      "",
      base64Lines(attachment.content)
    );
  }

  sections.push(`--${mixedBoundary}--`, "");

  return Buffer.from(sections.join("\r\n"));
}

export async function sendEmail(input: SendEmailInput) {
  try {
    const html = await htmlString(input.html);
    const to = asArray(input.to);

    const raw = buildRawMime({
      from: input.from ?? appConfig.SES_FROM_EMAIL,
      to,
      subject: input.subject,
      html,
      replyTo: input.replyTo,
      attachments: input.attachments,
    });

    await ses.send(
      new SendEmailCommand({
        Destination: {
          ToAddresses: to,
        },
        ConfigurationSetName: appConfig.SES_CONFIGURATION_SET,
        Content: {
          Raw: {
            Data: raw,
          },
        },
      })
    );

    return {
      success: true,
      message: "Email sent successfully",
    };
  } catch (error) {
    console.error("Failed to send email:", error);

    throw new Error(
      error instanceof Error ? error.message : "Failed to send email"
    );
  }
}

export async function sendRawHtmlEmail(args: {
  to: string;
  subject: string;
  html: string;
  from: string;
}) {
  return sendEmail(args);
}
