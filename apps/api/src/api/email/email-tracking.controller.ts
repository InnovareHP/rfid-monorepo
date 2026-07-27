import { Controller, Get, Param, Req, Res } from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Request, Response } from "express";
import { EmailTrackingService } from "./email-tracking.service";

@Controller("email")
@AllowAnonymous()
export class EmailTrackingController {
  constructor(private readonly trackingService: EmailTrackingService) {}

  // Always returns the pixel, match or not, so the endpoint cannot confirm an id.
  @Get("/o/:token")
  async trackOpen(
    @Param("token") token: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const trackingId = token.replace(/\.gif$/i, "");

    try {
      await this.trackingService.recordOpen(
        trackingId,
        req.ip,
        req.get("user-agent")
      );
    } catch {
      // Never let a tracking failure surface to the recipient.
    }

    res.set({
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      Pragma: "no-cache",
      Expires: "0",
    });

    res.send(this.trackingService.pixel);
  }
}
