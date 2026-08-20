import { Controller, Get, Query, Res } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
import { appConfig } from "src/config/app-config";
import { consumeOAuthState } from "src/lib/auth/oauth-state";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

@Controller("boards")
@AllowAnonymous()
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
    const claim = await consumeOAuthState("gmail", state);
    if (!claim) return this.failure(res, "gmail");

    try {
      await this.gmailService.handleCallback(code, claim.userId);
      res.redirect(
        `${appConfig.WEBSITE_URL}/${claim.orgId}/integrations?gmail=connected`
      );
    } catch {
      this.failure(res, "gmail");
    }
  }

  @Get("/outlook/callback")
  async handleOutlookCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response
  ) {
    const claim = await consumeOAuthState("outlook", state);
    if (!claim) return this.failure(res, "outlook");

    try {
      await this.outlookService.handleCallback(code, claim.userId);
      res.redirect(
        `${appConfig.WEBSITE_URL}/${claim.orgId}/integrations?outlook=connected`
      );
    } catch {
      this.failure(res, "outlook");
    }
  }

  // The caller is anonymous here, so the reason never travels in the redirect;
  // the frontend renders its own copy off the provider flag alone.
  private failure(res: Response, provider: "gmail" | "outlook") {
    res.redirect(`${appConfig.WEBSITE_URL}/integrations?${provider}=error`);
  }
}
