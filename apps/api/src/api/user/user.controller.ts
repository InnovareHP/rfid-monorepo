import { OnboardingStreamEvent, ROLES } from "@dashboard/shared";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
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
import { OnboardingDto } from "./dto/user.schema";
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

  @Get("admin/organizations")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminOrganizations(
    @Query("page") page: number = 1,
    @Query("take") take: number = 10,
    @Query("search") search?: string
  ) {
    try {
      return await this.userService.getAdminOrganizations({
        page: Number(page),
        take: Number(take),
        search,
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
}
