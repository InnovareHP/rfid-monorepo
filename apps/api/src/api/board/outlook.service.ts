import { Injectable, Logger } from "@nestjs/common";
import { render } from "@react-email/render";
import { appConfig } from "src/config/app-config";
import { prisma } from "src/lib/prisma/prisma";
import { ActivityEmail } from "src/react-email/activity-email";

const MICROSOFT_AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";
const SCOPES = ["Mail.Send", "User.Read", "offline_access"];

@Injectable()
export class OutlookService {
  private readonly logger = new Logger(OutlookService.name);

  private get clientId() {
    return appConfig.MICROSOFT_CLIENT_ID;
  }

  private get clientSecret() {
    return appConfig.MICROSOFT_CLIENT_SECRET;
  }

  private get redirectUri() {
    return `${appConfig.API_URL}/api/boards/outlook/callback`;
  }

  getAuthUrl(state: string): string {
    if (!this.clientId) {
      throw new Error("Microsoft OAuth is not configured");
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      redirect_uri: this.redirectUri,
      response_mode: "query",
      scope: SCOPES.join(" "),
      state,
      prompt: "consent",
    });

    return `${MICROSOFT_AUTH_URL}/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, userId: string): Promise<void> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Microsoft OAuth is not configured");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
        grant_type: "authorization_code",
        scope: SCOPES.join(" "),
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      this.logger.error(`Microsoft token exchange failed: ${error}`);
      throw new Error("Failed to exchange authorization code for tokens");
    }

    const tokens = await tokenResponse.json();

    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token received. Please try connecting again."
      );
    }

    // Fetch user email via Graph API
    const meResponse = await fetch(`${GRAPH_API_URL}/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!meResponse.ok) {
      throw new Error("Failed to fetch Microsoft user profile");
    }

    const profile = await meResponse.json();
    const outlookEmail = profile.mail || profile.userPrincipalName;

    await prisma.outlookToken.upsert({
      where: { user_id: userId },
      update: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000),
        outlook_email: outlookEmail,
      },
      create: {
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000),
        outlook_email: outlookEmail,
      },
    });
  }

  async getConnectionStatus(
    userId: string
  ): Promise<{ connected: boolean; email: string | null }> {
    const token = await prisma.outlookToken.findUnique({
      where: { user_id: userId },
      select: { outlook_email: true },
    });

    return {
      connected: !!token,
      email: token?.outlook_email ?? null,
    };
  }

  async disconnect(userId: string): Promise<void> {
    const token = await prisma.outlookToken.findUnique({
      where: { user_id: userId },
    });

    if (!token) return;

    await prisma.outlookToken.delete({ where: { user_id: userId } });
  }

  async trySendViaOutlook(
    userId: string,
    to: string,
    subject: string,
    recipientName: string,
    body: string,
    senderName: string
  ): Promise<boolean> {
    const token = await prisma.outlookToken.findUnique({
      where: { user_id: userId },
    });

    if (!token) return false;

    try {
      let accessToken = token.access_token;

      if (new Date() >= token.token_expiry) {
        accessToken = await this.refreshAccessToken(
          userId,
          token.refresh_token
        );
      }

      const htmlContent = await render(ActivityEmail({ recipientName, body }));

      const sendMailResponse = await fetch(`${GRAPH_API_URL}/me/sendMail`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject,
            body: {
              contentType: "HTML",
              content: htmlContent,
            },
            toRecipients: [
              {
                emailAddress: {
                  address: to,
                },
              },
            ],
          },
        }),
      });

      if (!sendMailResponse.ok) {
        const errorText = await sendMailResponse.text();
        this.logger.error(`Outlook send failed: ${errorText}`);

        if (sendMailResponse.status === 401) {
          await prisma.outlookToken
            .delete({ where: { user_id: userId } })
            .catch(() => {});
        }

        return false;
      }

      return true;
    } catch (error) {
      this.logger.error(
        `Outlook send failed for user ${userId}, falling back`,
        error
      );
      return false;
    }
  }

  private async refreshAccessToken(
    userId: string,
    refreshToken: string
  ): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Microsoft OAuth is not configured");
    }

    const response = await fetch(`${MICROSOFT_AUTH_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: SCOPES.join(" "),
      }),
    });

    if (!response.ok) {
      // Refresh failed — token is invalid, clean up
      await prisma.outlookToken
        .delete({ where: { user_id: userId } })
        .catch(() => {});
      throw new Error("Failed to refresh Outlook token");
    }

    const tokens = await response.json();

    await prisma.outlookToken.update({
      where: { user_id: userId },
      data: {
        access_token: tokens.access_token,
        token_expiry: new Date(Date.now() + tokens.expires_in * 1000),
        ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      },
    });

    return tokens.access_token;
  }
}
