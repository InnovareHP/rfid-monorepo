import { OnboardingStreamEvent, ROLES } from "@dashboard/shared";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  Session,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Roles, UserSession } from "@thallesp/nestjs-better-auth";
import type { Request, Response } from "express";
import { OnboardingGuard } from "src/guard/onboarding/onboarding.guard";
import { AdminEntitlementDto, OnboardingDto } from "./dto/user.schema";
import { UserService } from "./user.service";

// Bounds the export path, which asks for the whole filtered log in one page.
const ACTIVITY_LOG_MAX_TAKE = 5000;

@Controller("user")
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("onboarding")
  @UseGuards(OnboardingGuard)
  async onboarding(
    @Body() onboardDto: OnboardingDto,
    @Session() session: UserSession,
    @Req() request: Request,
    @Res() response: Response
  ) {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();

    const send = (event: OnboardingStreamEvent) =>
      response.write(`data: ${JSON.stringify(event)}\n\n`);

    try {
      const stream = this.userService.onboarding(
        onboardDto,
        session.user.id,
        new Headers({ cookie: request.headers.cookie ?? "" })
      );

      for await (const event of stream) {
        send(event);
      }
    } catch (error) {
      send({
        type: "error",
        message: error instanceof Error ? error.message : "Onboarding failed",
      });
    } finally {
      response.end();
    }
  }

  @Get("admin/users")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminUsers(
    @Query("page") page: number = 1,
    @Query("take") take: number = 10,
    @Query("search") search?: string,
    @Query("roleFilter") roleFilter?: string
  ) {
    try {
      return await this.userService.getAdminUsers({
        page: Number(page),
        take: Number(take),
        search,
        roleFilter,
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get("admin/users/:userId")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminUserById(@Param("userId") userId: string) {
    try {
      return await this.userService.getAdminUserById(userId);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get("admin/activity-log")
  @Roles([ROLES.SUPER_ADMIN])
  async getActivityLog(
    @Query("page") page: number = 1,
    @Query("take") take: number = 20,
    @Query("actionFilter") actionFilter?: string,
    @Query("adminId") adminId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    try {
      return await this.userService.getActivityLog({
        page: Number(page),
        take: Math.min(Number(take), ACTIVITY_LOG_MAX_TAKE),
        actionFilter,
        adminId,
        startDate,
        endDate,
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get("admin/metrics")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminMetrics() {
    try {
      return await this.userService.getAdminMetrics();
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get("admin/organizations")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminOrganizations(
    @Query("page") page: number = 1,
    @Query("take") take: number = 10,
    @Query("search") search?: string,
    @Query("hipaaOnly") hipaaOnly?: string
  ) {
    try {
      return await this.userService.getAdminOrganizations({
        page: Number(page),
        take: Number(take),
        search,
        hipaaOnly: hipaaOnly === "true",
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get("admin/organizations/:orgId")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminOrganizationById(@Param("orgId") orgId: string) {
    try {
      return await this.userService.getAdminOrganizationById(orgId);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Patch("admin/organizations/:orgId/entitlement")
  @Roles([ROLES.SUPER_ADMIN])
  async setAdminOrganizationEntitlement(
    @Param("orgId") orgId: string,
    @Body() body: AdminEntitlementDto,
    @Session() session: UserSession
  ) {
    return await this.userService.setAdminOrganizationEntitlement(
      session.user.id,
      session.user.name,
      orgId,
      body
    );
  }

  @Get("admin/organizations/:orgId/baa")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminOrganizationBaa(
    @Param("orgId") orgId: string,
    @Res() response: Response
  ) {
    const { document, termsVersion } =
      await this.userService.getAdminOrganizationBaa(orgId);

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="baa-${orgId}-${termsVersion}.pdf"`
    );
    response.send(document);
  }
}
