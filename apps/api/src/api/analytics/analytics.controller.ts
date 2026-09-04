import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { isOrgAdmin, readsOrgWideReferrals } from "@dashboard/shared";
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

  // One place for the download headers, so the four exports name their files
  // the same way.
  private sendPdf(response: Response, name: string, pdf: Buffer) {
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${name}-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf"`
    );
    response.send(pdf);
  }

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

      // Owner, admin and liaison read the whole org; everyone else reads the
      // referrals assigned to them.
      const assignedTo = readsOrgWideReferrals(session.session.memberRole)
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

  // Same scoping as the JSON route above: below liaison reads only what is
  // assigned to them, and the document says which scope it was rendered for.
  @RequirePermission({ analytics: ["read"] })
  @Get("pdf")
  async getReferralAnalyticsPdf(
    @Query("start") start: string,
    @Query("end") end: string,
    @Session() session: MemberSession,
    @Res() response: Response
  ) {
    const assignedTo = readsOrgWideReferrals(session.session.memberRole)
      ? null
      : session.session.userId;

    const pdf = await this.analyticsService.renderReferralAnalyticsPdf(
      session.session.activeOrganizationId,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
      assignedTo
    );

    this.sendPdf(response, "referral-analytics", pdf);
  }

  @RequirePermission({ analytics: ["read"] })
  @Get("master-list/pdf")
  async getMasterListAnalyticsPdf(
    @Query("start") start: string,
    @Query("end") end: string,
    @Session() session: MemberSession,
    @Res() response: Response
  ) {
    const assignedTo = readsOrgWideReferrals(session.session.memberRole)
      ? null
      : session.session.userId;

    const pdf = await this.analyticsService.renderMasterListAnalyticsPdf(
      session.session.activeOrganizationId,
      start ? new Date(start) : undefined,
      end ? new Date(end) : undefined,
      assignedTo
    );

    this.sendPdf(response, "master-list-analytics", pdf);
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
        readsOrgWideReferrals(session.session.memberRole)
          ? null
          : session.session.userId
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
  @Get("master-list")
  async getMasterListAnalytics(
    @Query("start") start: string,
    @Query("end") end: string,
    @Session()
    session: MemberSession
  ) {
    try {
      const startDate = start ? new Date(start) : undefined;
      const endDate = end ? new Date(end) : undefined;

      // The facility board follows the same read scope as referrals: everyone
      // below liaison reads only what is assigned to them.
      const assignedTo = readsOrgWideReferrals(session.session.memberRole)
        ? null
        : session.session.userId;

      return await this.analyticsService.getMasterListAnalytics(
        session.session.activeOrganizationId,
        startDate,
        endDate,
        assignedTo
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequireFeature("ai")
  @RequirePermission({ analytics: ["read"] })
  @Post("master-list/summary")
  async getMasterListSummary(
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

      return await this.analyticsService.getMasterListSummary(
        session.session.activeOrganizationId,
        startDate,
        endDate,
        analytics,
        force === "true",
        readsOrgWideReferrals(session.session.memberRole)
          ? null
          : session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["read"] })
  // Rendered server side so the download carries the letterhead and real text
  // rather than a screenshot of whatever the browser was showing.
  @RequirePermission({ analytics: ["read"] })
  @Get("marketing/pdf")
  async getMarketingLeadAnalyticsPdf(
    @Query("start") start: string,
    @Query("end") end: string,
    @Query("userId") userId: string,
    @Session() session: MemberSession,
    @Res() response: Response
  ) {
    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;
    const organizationId = session.session.activeOrganizationId;

    // Same scoping as the JSON route: a liaison reads their own report only,
    // and the client's userId is ignored rather than trusted below admin.
    const userIdValue = isOrgAdmin(session.session.memberRole)
      ? userId || null
      : session.session.userId;

    const pdf = await this.analyticsService.renderMarketingLeadAnalyticsPdf(
      organizationId,
      startDate,
      endDate,
      userIdValue
    );

    this.sendPdf(response, "liaison-performance", pdf);
  }

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
