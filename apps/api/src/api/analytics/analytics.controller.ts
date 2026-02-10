import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Session,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { StripeGuard } from "src/guard/stripe/stripe.guard";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @UseGuards(AuthGuard)
  @UseGuards(StripeGuard)
  async getAllAnalytics(
    @Query("start") start: string,
    @Query("end") end: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const startDate = start ? new Date(start) : undefined;
      const endDate = end ? new Date(end) : undefined;
      const organizationId = session.session.activeOrganizationId;

      return await this.analyticsService.getAllAnalytics(
        organizationId,
        startDate!,
        endDate!
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("summary")
  async getGeminiAnalytics(@Query("analytics") analytics: any) {
    try {
      return await this.analyticsService.getAnalyticsByGemini(analytics);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("marketing")
  async getMarketingLeadAnalytics(
    @Query("start") start: string,
    @Query("end") end: string,
    @Query("userId") userId: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const startDate = start ? new Date(start) : undefined;
      const endDate = end ? new Date(end) : undefined;

      const organizationId = session.session.activeOrganizationId;
      const userIdValue = userId ? userId : null;
      return await this.analyticsService.getMarketingLeadAnalytics(
        organizationId,
        startDate,
        endDate,
        userIdValue
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
