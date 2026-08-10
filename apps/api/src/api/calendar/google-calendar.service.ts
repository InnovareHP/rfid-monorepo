import { randomUUID } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { calendar_v3, google } from "googleapis";
import { appConfig } from "src/config/app-config";
import { prisma } from "src/lib/prisma/prisma";

@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger(GoogleCalendarService.name);

  private createOAuth2Client() {
    return new google.auth.OAuth2(
      appConfig.GOOGLE_CLIENT_ID,
      appConfig.GOOGLE_CLIENT_SECRET,
      `${appConfig.API_URL}/api/calendar/google/callback`
    );
  }

  getAuthUrl(state: string): string {
    const oauth2Client = this.createOAuth2Client();

    return oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state,
    });
  }

  async handleCallback(code: string, userId: string): Promise<void> {
    const oauth2Client = this.createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    this.logger.log(
      `Google Calendar OAuth tokens received - scope: ${tokens.scope}`
    );

    if (!tokens.refresh_token) {
      throw new Error(
        "No refresh token received. Please try connecting again."
      );
    }

    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email!;

    await prisma.googleCalendarToken.upsert({
      where: { userId },
      update: {
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expiry_date!),
        email,
      },
      create: {
        userId,
        accessToken: tokens.access_token!,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expiry_date!),
        email,
      },
    });
  }

  async getConnectionStatus(
    userId: string
  ): Promise<{ connected: boolean; email: string | null }> {
    const token = await prisma.googleCalendarToken.findUnique({
      where: { userId },
      select: { email: true },
    });

    return {
      connected: !!token,
      email: token?.email ?? null,
    };
  }

  async disconnect(userId: string): Promise<void> {
    const token = await prisma.googleCalendarToken.findUnique({
      where: { userId },
    });

    if (!token) return;

    try {
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({ access_token: token.accessToken });
      await oauth2Client.revokeToken(token.accessToken);
    } catch {
      this.logger.warn(
        `Failed to revoke Google Calendar token for user ${userId}`
      );
    }

    await prisma.googleCalendarToken.delete({ where: { userId } });
  }

  async getEvents(
    userId: string,
    timeMin: string,
    timeMax: string
  ): Promise<any[]> {
    const token = await prisma.googleCalendarToken.findUnique({
      where: { userId },
    });

    if (!token) return [];

    try {
      const oauth2Client = this.createOAuth2Client();
      oauth2Client.setCredentials({
        access_token: token.accessToken,
        refresh_token: token.refreshToken,
        expiry_date: token.tokenExpiry.getTime(),
      });

      oauth2Client.on("tokens", async (newTokens) => {
        try {
          await prisma.googleCalendarToken.update({
            where: { userId },
            data: {
              accessToken: newTokens.access_token!,
              tokenExpiry: new Date(newTokens.expiry_date!),
              ...(newTokens.refresh_token && {
                refreshToken: newTokens.refresh_token,
              }),
            },
          });
        } catch (err) {
          this.logger.error(
            "Failed to persist refreshed Google Calendar token",
            err
          );
        }
      });

      const calendar = google.calendar({ version: "v3", auth: oauth2Client });
      const response = await calendar.events.list({
        calendarId: "primary",
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: "startTime",
        maxResults: 250,
      });

      return (response.data.items || []).map((event) => ({
        id: event.id,
        title: event.summary || "(No title)",
        description: event.description || null,
        start: event.start?.dateTime || event.start?.date || null,
        end: event.end?.dateTime || event.end?.date || null,
        allDay: !event.start?.dateTime,
        location: event.location || null,
        htmlLink: event.htmlLink || null,
        provider: "google",
        status: event.status,
        organizer: event.organizer?.email || null,
        attendees:
          event.attendees?.map((a) => ({
            email: a.email,
            responseStatus: a.responseStatus,
          })) || [],
      }));
    } catch (error: any) {
      this.logger.error(
        `Google Calendar fetch failed for user ${userId}`,
        error
      );

      if (error?.response?.status === 401 || error?.code === "invalid_grant") {
        await prisma.googleCalendarToken
          .delete({ where: { userId } })
          .catch(() => {});
      }

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
      createConference?: boolean;
    }
  ) {
    const token = await prisma.googleCalendarToken.findUnique({
      where: { userId },
    });

    if (!token) throw new Error("Google Calendar not connected");

    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.tokenExpiry.getTime(),
    });

    oauth2Client.on("tokens", async (newTokens) => {
      try {
        await prisma.googleCalendarToken.update({
          where: { userId },
          data: {
            accessToken: newTokens.access_token!,
            tokenExpiry: new Date(newTokens.expiry_date!),
            ...(newTokens.refresh_token && {
              refreshToken: newTokens.refresh_token,
            }),
          },
        });
      } catch (err) {
        this.logger.error("Failed to persist refreshed token", err);
      }
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event: any = {
      summary: eventData.title,
      description: eventData.description,
      location: eventData.location,
    };

    if (eventData.allDay) {
      event.start = { date: eventData.startTime.split("T")[0] };
      event.end = { date: eventData.endTime.split("T")[0] };
    } else {
      event.start = { dateTime: eventData.startTime };
      event.end = { dateTime: eventData.endTime };
    }

    if (eventData.attendees?.length) {
      event.attendees = eventData.attendees.map((email) => ({ email }));
    }

    // Google only mints the Meet link when conferenceDataVersion is 1; the
    // request is otherwise accepted and the conference silently dropped.
    if (eventData.createConference) {
      event.conferenceData = {
        createRequest: {
          requestId: randomUUID(),
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: eventData.createConference ? 1 : 0,
    });

    const meetingUrl = eventData.createConference
      ? await this.resolveMeetingUrl(calendar, response.data)
      : null;

    return {
      id: response.data.id,
      title: response.data.summary,
      start: response.data.start?.dateTime || response.data.start?.date,
      end: response.data.end?.dateTime || response.data.end?.date,
      htmlLink: response.data.htmlLink,
      meetingUrl,
      provider: "google",
    };
  }

  private readMeetingUrl(event: calendar_v3.Schema$Event): string | null {
    return (
      event.hangoutLink ??
      event.conferenceData?.entryPoints?.find(
        (entry) => entry.entryPointType === "video"
      )?.uri ??
      null
    );
  }

  // Google mints the conference asynchronously, so a pending insert carries no
  // join link yet and the event has to be re-read.
  private async resolveMeetingUrl(
    calendar: calendar_v3.Calendar,
    created: calendar_v3.Schema$Event
  ): Promise<string | null> {
    const immediate = this.readMeetingUrl(created);
    if (immediate) return immediate;

    // Only a failure is terminal; a missing status still resolves on a re-read.
    if (
      !created.id ||
      created.conferenceData?.createRequest?.status?.statusCode === "failure"
    ) {
      return null;
    }

    for (const delayMs of [1000, 2000]) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      try {
        const { data } = await calendar.events.get({
          calendarId: "primary",
          eventId: created.id,
        });
        const url = this.readMeetingUrl(data);
        if (url) return url;
      } catch (error) {
        this.logger.warn(`Failed to re-read event for Meet link: ${error}`);
        return null;
      }
    }

    return null;
  }

  async getMeetingUrl(userId: string, eventId: string): Promise<string | null> {
    const token = await prisma.googleCalendarToken.findUnique({
      where: { userId },
    });

    if (!token) return null;

    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.tokenExpiry.getTime(),
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    try {
      const { data } = await calendar.events.get({
        calendarId: "primary",
        eventId,
      });
      return this.readMeetingUrl(data);
    } catch (error) {
      this.logger.warn(`Failed to read Meet link for event ${eventId}`, error);
      return null;
    }
  }

  async deleteEvent(userId: string, eventId: string): Promise<void> {
    const token = await prisma.googleCalendarToken.findUnique({
      where: { userId },
    });

    if (!token) throw new Error("Google Calendar not connected");

    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expiry_date: token.tokenExpiry.getTime(),
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    await calendar.events.delete({
      calendarId: "primary",
      eventId,
    });
  }
}
