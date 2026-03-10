import { Controller, Get, Query, Res } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { appConfig } from "src/config/app-config";
import { GoogleCalendarService } from "./google-calendar.service";
import { OutlookCalendarService } from "./outlook-calendar.service";

@Controller("calendar")
@AllowAnonymous()
export class CalendarOAuthCallbackController {
  constructor(
    private readonly googleCalendarService: GoogleCalendarService,
    private readonly outlookCalendarService: OutlookCalendarService
  ) {}

  @Get("/google/callback")
  async handleGoogleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response
  ) {
    try {
      const { userId, orgId } = JSON.parse(state);
      await this.googleCalendarService.handleCallback(code, userId);
      res.redirect(
        `${appConfig.WEBSITE_URL}/${orgId}/integrations?google_calendar=connected`
      );
    } catch (error: any) {
      res.redirect(
        `${appConfig.WEBSITE_URL}/integrations?google_calendar=error&message=${encodeURIComponent(error.message)}`
      );
    }
  }

  @Get("/outlook/callback")
  async handleOutlookCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response
  ) {
    try {
      const { userId, orgId } = JSON.parse(state);
      await this.outlookCalendarService.handleCallback(code, userId);
      res.redirect(
        `${appConfig.WEBSITE_URL}/${orgId}/integrations?outlook_calendar=connected`
      );
    } catch (error: any) {
      res.redirect(
        `${appConfig.WEBSITE_URL}/integrations?outlook_calendar=error&message=${encodeURIComponent(error.message)}`
      );
    }
  }
}
