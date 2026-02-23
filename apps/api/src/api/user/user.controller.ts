import { ROLES } from "@dashboard/shared";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Session,
  UseGuards,
} from "@nestjs/common";
import { AdminAction } from "@prisma/client";
import { AuthGuard, Roles, UserSession } from "@thallesp/nestjs-better-auth";
import { OnboardingGuard } from "src/guard/onboarding/onboarding.guard";
import { OnboardingDto } from "./dto/user.schema";
import { UserService } from "./user.service";

@Controller("user")
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post("onboarding")
  @UseGuards(OnboardingGuard)
  async onboarding(
    @Body() onboardDto: OnboardingDto,
    @Session() session: UserSession
  ) {
    try {
      const user = await this.userService.onboarding(
        onboardDto,
        session.user.id
      );
      return { user };
    } catch (error) {
      throw new BadRequestException(error);
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
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    try {
      return await this.userService.getActivityLog({
        page: Number(page),
        take: Number(take),
        actionFilter,
        startDate,
        endDate,
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Post("admin/ban")
  @Roles([ROLES.SUPER_ADMIN])
  async banUser(
    @Body() body: { userId: string; banReason?: string; banExpiresIn?: number },
    @Session() session: UserSession
  ) {
    try {
      return await this.userService.adminBanUser(
        session.user.id,
        body.userId,
        body.banReason,
        body.banExpiresIn
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Post("admin/unban")
  @Roles([ROLES.SUPER_ADMIN])
  async unbanUser(
    @Body() body: { userId: string },
    @Session() session: UserSession
  ) {
    try {
      return await this.userService.adminUnbanUser(
        session.user.id,
        body.userId
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Post("admin/set-role")
  @Roles([ROLES.SUPER_ADMIN])
  async setRole(
    @Body() body: { userId: string; role: string },
    @Session() session: UserSession
  ) {
    try {
      return await this.userService.adminSetRole(
        session.user.id,
        body.userId,
        body.role
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Post("admin/remove")
  @Roles([ROLES.SUPER_ADMIN])
  async removeUser(
    @Body() body: { userId: string },
    @Session() session: UserSession
  ) {
    try {
      return await this.userService.adminRemoveUser(
        session.user.id,
        body.userId
      );
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Post("admin/log-action")
  @Roles([ROLES.SUPER_ADMIN])
  async logAction(
    @Body()
    body: { action: string; targetUserId?: string; targetOrgId?: string },
    @Session() session: UserSession
  ) {
    try {
      return await this.userService.logAdminAction({
        adminId: session.user.id,
        action: body.action as AdminAction,
        targetUserId: body.targetUserId,
        targetOrgId: body.targetOrgId,
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
