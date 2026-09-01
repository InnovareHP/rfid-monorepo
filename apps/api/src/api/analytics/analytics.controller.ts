import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { isOrgAdmin } from "@dashboard/shared";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import {
  EntitlementGuard,
  RequireFeature,
} from "../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../guard/hipaa/hipaa.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { AnalyticsService } from "./analytics.service";

@Controller("analytics")
@UseGuards(
  AuthGuard,
  SubscriptionGuard,
  PermissionGuard,
  EntitlementGuard,
  HipaaGuard
)
@RequireFeature("advanced_analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @RequirePermission({ analytics: ["read"] })
  @Get()
  async getAllAnalytics(
    @Query("start") start: string,
    @Query("end") end: string,
    @Session()
    session: MemberSession
  ) {
    try {
      const startDate = start ? new Date(start) : undefined;
      const endDate = end ? new Date(end) : undefined;
      const organizationId = session.session.activeOrganizationId;

      // Owner and admin read the whole org; everyone else reads the referrals
      // assigned to them.
      const assignedTo = isOrgAdmin(session.session.memberRole)
        ? null
        : session.session.userId;

      return await this.analyticsService.getAllAnalytics(
        organizationId,
        startDate!,
        endDate!,
        assignedTo
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequireFeature("ai")
  @RequirePermission({ analytics: ["read"] })
  @Post("summary")
  async getGeminiAnalytics(
    @Body("analytics") analytics: any,
    @Query("start") start: string,
    @Query("end") end: string,
    @Query("force") force: string,
    @Session()
    session: MemberSession
  ) {
    try {
      const startDate = start ? new Date(start) : undefined;
      const endDate = end ? new Date(end) : undefined;
      const organizationId = session.session.activeOrganizationId;

      return await this.analyticsService.getAnalyticsByGemini(
        organizationId,
        startDate,
        endDate,
        analytics,
        force === "true",
        isOrgAdmin(session.session.memberRole) ? null : session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["read"] })
  @Get("jobs/:jobId/result")
  async getJobResult(
    @Param("jobId") jobId: string,
    @Session() session: AuthenticatedSession
  ) {
    return await this.analyticsService.getJobResult(
      jobId,
      session.session.activeOrganizationId
    );
  }

  @RequirePermission({ analytics: ["read"] })
  @Get("marketing")
  async getMarketingLeadAnalytics(
    @Query("start") start: string,
    @Query("end") end: string,
    @Query("userId") userId: string,
    @Session()
    session: MemberSession
  ) {
    try {
      const startDate = start ? new Date(start) : undefined;
      const endDate = end ? new Date(end) : undefined;

      const organizationId = session.session.activeOrganizationId;

      // A liaison reads their own report only, so the client's userId is
      // ignored rather than trusted for anyone below owner or admin.
      const userIdValue = isOrgAdmin(session.session.memberRole)
        ? userId || null
        : session.session.userId;
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
