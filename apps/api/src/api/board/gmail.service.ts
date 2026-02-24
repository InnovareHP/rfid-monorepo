import { Injectable, Logger } from "@nestjs/common";
import { render } from "@react-email/render";
import { google } from "googleapis";
import { appConfig } from "src/config/app-config";
import { prisma } from "src/lib/prisma/prisma";
import { ActivityEmail } from "src/react-email/activity-email";

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  private createOAuth2Client() {
    return new google.auth.OAuth2(
      appConfig.GOOGLE_CLIENT_ID,
      appConfig.GOOGLE_CLIENT_SECRET,
      `${appConfig.API_URL}/api/boards/gmail/callback`
    );
  }

  getAuthUrl(state: string): string {
    const oauth2Client = this.createOAuth2Client();

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state,
    });
  }

  async handleCallback(code: string, userId: string): Promise<void> {
    const oauth2Client = this.createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    this.logger.log(`Gmail OAuth tokens received - scope: ${tokens.scope}`);

    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token received. Please try connecting again."
      );
    }

    if (!tokens.scope?.includes("gmail.send")) {
      throw new Error(
        "Gmail send permission was not granted. Please remove app access at https://myaccount.google.com/permissions and try again."
      );
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const gmailAddress = userInfo.data.email!;

    await prisma.gmailToken.upsert({
      where: { user_id: userId },
      update: {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(tokens.expiry_date!),
        gmail_address: gmailAddress,
      },
      create: {
        user_id: userId,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(tokens.expiry_date!),
        gmail_address: gmailAddress,
      },
    });
  }

  async getConnectionStatus(
    userId: string
  ): Promise<{ connected: boolean; email: string | null }> {
    const token = await prisma.gmailToken.findUnique({
      where: { user_id: userId },
      select: { gmail_address: true },
    });

    return {
      connected: !!token,
      email: token?.gmail_address ?? null,
    };
  }

  async disconnect(userId: string): Promise<void> {
    const token = await prisma.gmailToken.findUnique({
      where: { user_id: userId },
    });

    if (!token) return;

    try {
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({ access_token: token.access_token });
      await oauth2Client.revokeToken(token.access_token);
    } catch {
      this.logger.warn(`Failed to revoke Google token for user ${userId}`);
    }

    await prisma.gmailToken.delete({ where: { user_id: userId } });
  }

  async trySendViaGmail(
    userId: string,
    to: string,
    subject: string,
    recipientName: string,
    body: string,
    senderName: string
  ): Promise<boolean> {
    const token = await prisma.gmailToken.findUnique({
      where: { user_id: userId },
    });

    if (!token) return false;

    try {
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        expiry_date: token.token_expiry.getTime(),
      });

      oauth2Client.on("tokens", async (newTokens) => {
        try {
          await prisma.gmailToken.update({
            where: { user_id: userId },
            data: {
              access_token: newTokens.access_token!,
              token_expiry: new Date(newTokens.expiry_date!),
              ...(newTokens.refresh_token && {
                refresh_token: newTokens.refresh_token,
              }),
            },
          });
        } catch (err) {
          this.logger.error("Failed to persist refreshed Gmail token", err);
        }
      });

      const htmlContent = await render(ActivityEmail({ recipientName, body }));

      const rawMessage = this.buildRawEmail(
        `${senderName} <${token.gmail_address}>`,
        to,
        subject,
        htmlContent
      );

      const gmail = google.gmail({ version: "v1", auth: oauth2Client });
      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: rawMessage,
        },
      });

      return true;
    } catch (error) {
      this.logger.error(
        `Gmail send failed for user ${userId}, falling back to Resend`,
        error
      );

      if (error?.response?.status === 401 || error?.code === "invalid_grant") {
        await prisma.gmailToken
          .delete({ where: { user_id: userId } })
          .catch(() => {});
      }

      return false;
    }
  }

  private buildRawEmail(
    from: string,
    to: string,
    subject: string,
    htmlBody: string
  ): string {
    const messageParts = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      htmlBody,
    ];

    const message = messageParts.join("\r\n");

    return Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
}
