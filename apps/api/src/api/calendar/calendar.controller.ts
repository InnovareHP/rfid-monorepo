import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { GoogleCalendarService } from "./google-calendar.service";
import { OutlookCalendarService } from "./outlook-calendar.service";

@Controller("calendar")
@UseGuards(AuthGuard)
export class CalendarController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly outlookCalendarService: OutlookCalendarService
  ) {}

  @Get("/google/auth-url")
  async getGoogleAuthUrl(@Session() session: AuthenticatedSession) {
    try {
      const state = JSON.stringify({
        userId: session.user.id,
        orgId: session.session.activeOrganizationId,
      });
      const url = this.googleCalendarService.getAuthUrl(state);
      return { url };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/google/status")
  async getGoogleStatus(@Session() session: AuthenticatedSession) {
    try {
      return await this.googleCalendarService.getConnectionStatus(
        session.user.id
      );
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/google/disconnect")
  async disconnectGoogle(@Session() session: AuthenticatedSession) {
    try {
      await this.googleCalendarService.disconnect(session.user.id);
      return { message: "Google Calendar disconnected successfully" };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/outlook/auth-url")
  async getOutlookAuthUrl(@Session() session: AuthenticatedSession) {
    try {
      const state = JSON.stringify({
        userId: session.user.id,
        orgId: session.session.activeOrganizationId,
      });
      const url = this.outlookCalendarService.getAuthUrl(state);
      return { url };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/outlook/status")
  async getOutlookStatus(@Session() session: AuthenticatedSession) {
    try {
      return await this.outlookCalendarService.getConnectionStatus(
        session.user.id
      );
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/outlook/disconnect")
  async disconnectOutlook(@Session() session: AuthenticatedSession) {
    try {
      await this.outlookCalendarService.disconnect(session.user.id);
      return { message: "Outlook Calendar disconnected successfully" };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/events")
  async getEvents(
    @Session() session: AuthenticatedSession,
    @Query("timeMin") timeMin: string,
    @Query("timeMax") timeMax: string
  ) {
    try {
      if (!timeMin || !timeMax) {
        throw new BadRequestException("timeMin and timeMax are required");
      }

      const [googleEvents, outlookEvents] = await Promise.all([
        this.googleCalendarService.getEvents(session.user.id, timeMin, timeMax),
        this.outlookCalendarService.getEvents(
          session.user.id,
          timeMin,
          timeMax
        ),
      ]);

      return [...googleEvents, ...outlookEvents].sort((a, b) => {
        const aStart = new Date(a.start || 0).getTime();
        const bStart = new Date(b.start || 0).getTime();
        return aStart - bStart;
      });
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Post("/events")
  async createEvent(
    @Session() session: AuthenticatedSession,
    @Body()
    body: {
      provider: "google" | "outlook";
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      allDay?: boolean;
      location?: string;
      attendees?: string[];
    }
  ) {
    try {
      if (body.provider === "google") {
        return await this.googleCalendarService.createEvent(
          session.user.id,
          body
        );
      } else if (body.provider === "outlook") {
        return await this.outlookCalendarService.createEvent(
          session.user.id,
          body
        );
      }

      throw new BadRequestException("Invalid provider");
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/events/:provider/:eventId")
  async deleteEvent(
    @Session() session: AuthenticatedSession,
    @Param("provider") provider: string,
    @Param("eventId") eventId: string
  ) {
    try {
      if (provider === "google") {
        await this.googleCalendarService.deleteEvent(session.user.id, eventId);
      } else if (provider === "outlook") {
        await this.outlookCalendarService.deleteEvent(session.user.id, eventId);
      } else {
        throw new BadRequestException("Invalid provider");
      }

      return { message: "Event deleted successfully" };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/status")
  async getConnectionStatus(@Session() session: AuthenticatedSession) {
    try {
      const [google, outlook] = await Promise.all([
        this.googleCalendarService.getConnectionStatus(session.user.id),
        this.outlookCalendarService.getConnectionStatus(session.user.id),
      ]);

      return { google, outlook };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
