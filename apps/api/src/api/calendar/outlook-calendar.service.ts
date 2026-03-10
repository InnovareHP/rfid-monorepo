import { Injectable, Logger } from "@nestjs/common";
import { appConfig } from "src/config/app-config";
import { prisma } from "src/lib/prisma/prisma";

const MICROSOFT_AUTH_URL =
  "https://login.microsoftonline.com/common/oauth2/v2.0";
const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";
const SCOPES = [
  "Calendars.ReadWrite",
  "User.Read",
  "offline_access",
];

@Injectable()
export class OutlookCalendarService {
  private readonly logger = new Logger(OutlookCalendarService.name);

  private get clientId() {
    return appConfig.MICROSOFT_CLIENT_ID;
  }

  private get clientSecret() {
    return appConfig.MICROSOFT_CLIENT_SECRET;
  }

  private get redirectUri() {
    return `${appConfig.API_URL}/api/calendar/outlook/callback`;
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
      this.logger.error(`Microsoft Calendar token exchange failed: ${error}`);
      throw new Error("Failed to exchange authorization code for tokens");
    }

    const tokens = await tokenResponse.json();

    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token received. Please try connecting again."
      );
    }

    const meResponse = await fetch(`${GRAPH_API_URL}/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!meResponse.ok) {
      throw new Error("Failed to fetch Microsoft user profile");
    }

    const profile = await meResponse.json();
    const email = profile.mail || profile.userPrincipalName;

    await prisma.outlookCalendarToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        email,
      },
      create: {
        userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        email,
      },
    });
  }

  async getConnectionStatus(
    userId: string
  ): Promise<{ connected: boolean; email: string | null }> {
    const token = await prisma.outlookCalendarToken.findUnique({
      where: { userId },
      select: { email: true },
    });

    return {
      connected: !!token,
      email: token?.email ?? null,
    };
  }

  async disconnect(userId: string): Promise<void> {
    const token = await prisma.outlookCalendarToken.findUnique({
      where: { userId },
    });

    if (!token) return;

    await prisma.outlookCalendarToken.delete({ where: { userId } });
  }

  async getEvents(
    userId: string,
    timeMin: string,
    timeMax: string
  ): Promise<any[]> {
    const token = await prisma.outlookCalendarToken.findUnique({
      where: { userId },
    });

    if (!token) return [];

    try {
      let accessToken = token.accessToken;

      if (new Date() >= token.tokenExpiry) {
        accessToken = await this.refreshAccessToken(
          userId,
          token.refreshToken
        );
      }

      const params = new URLSearchParams({
        startDateTime: timeMin,
        endDateTime: timeMax,
        $top: "250",
        $orderby: "start/dateTime",
        $select:
          "id,subject,bodyPreview,start,end,isAllDay,location,webLink,organizer,attendees,isCancelled",
      });

      const response = await fetch(
        `${GRAPH_API_URL}/me/calendarView?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'outlook.timezone="UTC"',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Outlook Calendar fetch failed: ${errorText}`);

        if (response.status === 401) {
          await prisma.outlookCalendarToken
            .delete({ where: { userId } })
            .catch(() => {});
        }

        return [];
      }

      const data = await response.json();

      return (data.value || []).map((event: any) => ({
        id: event.id,
        title: event.subject || "(No title)",
        description: event.bodyPreview || null,
        start: event.start?.dateTime
          ? event.start.dateTime + "Z"
          : null,
        end: event.end?.dateTime
          ? event.end.dateTime + "Z"
          : null,
        allDay: event.isAllDay || false,
        location: event.location?.displayName || null,
        htmlLink: event.webLink || null,
        provider: "outlook",
        status: event.isCancelled ? "cancelled" : "confirmed",
        organizer: event.organizer?.emailAddress?.address || null,
        attendees:
          event.attendees?.map((a: any) => ({
            email: a.emailAddress?.address,
            responseStatus: a.status?.response,
          })) || [],
      }));
    } catch (error) {
      this.logger.error(
        `Outlook Calendar fetch failed for user ${userId}`,
        error
      );
      return [];
    }
  }

  async createEvent(
    userId: string,
    eventData: {
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      allDay?: boolean;
      location?: string;
      attendees?: string[];
    }
  ) {
    const token = await prisma.outlookCalendarToken.findUnique({
      where: { userId },
    });

    if (!token) throw new Error("Outlook Calendar not connected");

    let accessToken = token.accessToken;
    if (new Date() >= token.tokenExpiry) {
      accessToken = await this.refreshAccessToken(
        userId,
        token.refreshToken
      );
    }

    const event: any = {
      subject: eventData.title,
      body: {
        contentType: "Text",
        content: eventData.description || "",
      },
      isAllDay: eventData.allDay || false,
    };

    if (eventData.allDay) {
      event.start = {
        dateTime: eventData.startTime.split("T")[0] + "T00:00:00",
        timeZone: "UTC",
      };
      event.end = {
        dateTime: eventData.endTime.split("T")[0] + "T00:00:00",
        timeZone: "UTC",
      };
    } else {
      event.start = { dateTime: eventData.startTime, timeZone: "UTC" };
      event.end = { dateTime: eventData.endTime, timeZone: "UTC" };
    }

    if (eventData.location) {
      event.location = { displayName: eventData.location };
    }

    if (eventData.attendees?.length) {
      event.attendees = eventData.attendees.map((email) => ({
        emailAddress: { address: email },
        type: "required",
      }));
    }

    const response = await fetch(`${GRAPH_API_URL}/me/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Outlook event: ${errorText}`);
    }

    const created = await response.json();

    return {
      id: created.id,
      title: created.subject,
      start: created.start?.dateTime,
      end: created.end?.dateTime,
      htmlLink: created.webLink,
      provider: "outlook",
    };
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const token = await prisma.outlookCalendarToken.findUnique({
      where: { userId },
    });

    if (!token) throw new Error("Outlook Calendar not connected");

    let accessToken = token.accessToken;
    if (new Date() >= token.tokenExpiry) {
      accessToken = await this.refreshAccessToken(
        userId,
        token.refreshToken
      );
    }

    const response = await fetch(
      `${GRAPH_API_URL}/me/events/${eventId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      throw new Error(`Failed to delete Outlook event: ${errorText}`);
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
      await prisma.outlookCalendarToken
        .delete({ where: { userId } })
        .catch(() => {});
      throw new Error("Failed to refresh Outlook Calendar token");
    }

    const tokens = await response.json();

    await prisma.outlookCalendarToken.update({
      where: { userId },
      data: {
        accessToken: tokens.access_token,
        tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        ...(tokens.refresh_token && {
          refreshToken: tokens.refresh_token,
        }),
      },
    });

    return tokens.access_token;
  }
}
