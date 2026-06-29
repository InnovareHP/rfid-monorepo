import {
  SendEmailCommand,
  SESv2Client,
} from "@aws-sdk/client-sesv2";
import { render } from "@react-email/render";
import { appConfig } from "../../config/app-config";

export const sesClient = new SESv2Client({
  region: appConfig.AWS_REGION,
  credentials: {
    accessKeyId: appConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: appConfig.AWS_SECRET_ACCESS_KEY,
  },
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
}

function asArray(v: string | string[]): string[] {
  return Array.isArray(v) ? v : [v];
}

async function htmlString(html: React.ReactNode | string): Promise<string> {
  return typeof html === "string" ? html : await render(html);
}

export async function sendEmail(input: SendEmailInput) {
  const Html = await htmlString(input.html);
  await sesClient.send(
    new SendEmailCommand({
      FromEmailAddress: input.from ?? appConfig.SES_FROM_EMAIL,
      Destination: { ToAddresses: asArray(input.to) },
      ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: "UTF-8" },
          Body: { Html: { Data: Html, Charset: "UTF-8" } },
        },
      },
    })
  );
  return { message: "Email sent successfully" };
}

export async function sendRawHtmlEmail(args: {
  to: string;
  subject: string;
  html: string;
  from: string;
}) {
  return sendEmail(args);
}
