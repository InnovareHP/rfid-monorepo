import { Controller, Get, Query, Res } from "@nestjs/common";
import type { Response } from "express";
import { appConfig } from "src/config/app-config";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

@Controller("boards")
export class BoardOAuthCallbackController {
  constructor(
    private readonly gmailService: GmailService,
    private readonly outlookService: OutlookService
  ) {}

  @Get("/gmail/callback")
  async handleGmailCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response
  ) {
    try {
      const { userId, orgId } = JSON.parse(state);
      await this.gmailService.handleCallback(code, userId);
      res.redirect(
        `${appConfig.WEBSITE_URL}/${orgId}/profile?gmail=connected`
      );
    } catch (error) {
      res.redirect(
        `${appConfig.WEBSITE_URL}/profile?gmail=error&message=${encodeURIComponent(error.message)}`
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
      await this.outlookService.handleCallback(code, userId);
      res.redirect(
        `${appConfig.WEBSITE_URL}/${orgId}/profile?outlook=connected`
      );
    } catch (error) {
      res.redirect(
        `${appConfig.WEBSITE_URL}/profile?outlook=error&message=${encodeURIComponent(error.message)}`
      );
    }
  }
}
