import { Controller, Get, Query, Res } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { appConfig } from "src/config/app-config";
import { consumeOAuthState } from "src/lib/auth/oauth-state";
import { GoogleCalendarService } from "./google-calendar.service";
import { OutlookCalendarService } from "./outlook-calendar.service";
import { assertNoOtherCalendar } from "./single-calendar";

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
    const claim = await consumeOAuthState("google-calendar", state);
    if (!claim) return this.failure(res, "google_calendar");

    try {
      await assertNoOtherCalendar(
        "google",
        claim.userId,
        this.googleCalendarService,
        this.outlookCalendarService
      );
      await this.googleCalendarService.handleCallback(code, claim.userId);
      res.redirect(
        `${appConfig.WEBSITE_URL}/${claim.orgId}/integrations?google_calendar=connected`
      );
    } catch {
      this.failure(res, "google_calendar");
    }
  }

  @Get("/outlook/callback")
  async handleOutlookCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response
  ) {
    const claim = await consumeOAuthState("outlook-calendar", state);
    if (!claim) return this.failure(res, "outlook_calendar");

    try {
      await assertNoOtherCalendar(
        "outlook",
        claim.userId,
        this.googleCalendarService,
        this.outlookCalendarService
      );
      await this.outlookCalendarService.handleCallback(code, claim.userId);
      res.redirect(
        `${appConfig.WEBSITE_URL}/${claim.orgId}/integrations?outlook_calendar=connected`
      );
    } catch {
      this.failure(res, "outlook_calendar");
    }
  }

  // The single-calendar reason already surfaced on the authenticated auth-url
  // call, so this anonymous redirect carries the provider flag and nothing else.
  private failure(
    res: Response,
    provider: "google_calendar" | "outlook_calendar"
  ) {
    res.redirect(`${appConfig.WEBSITE_URL}/integrations?${provider}=error`);
  }
}
