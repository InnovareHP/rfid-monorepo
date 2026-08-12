import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { EntitlementGuard } from "../../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../../guard/hipaa/hipaa.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../../guard/permission/permission.guard";
import { SubscriptionGuard } from "../../../guard/subscription/subscription.guard";
import {
  CreateGroupDto,
  PreviewGroupDto,
  UpdateGroupDto,
} from "./dto/group.dto";
import { GroupService } from "./group.service";

const PAGE_SIZE_CAP = 100;

@Controller("marketing/groups")
@UseGuards(
  AuthGuard,
  SubscriptionGuard,
  PermissionGuard,
  EntitlementGuard,
  HipaaGuard
)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @RequirePermission({ outreach: ["read"] })
  @Get("/")
  async getGroups(@Session() session: AuthenticatedSession) {
    try {
      return await this.groupService.getGroups(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Post("/preview")
  async preview(
    @Body() dto: PreviewGroupDto,
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.groupService.previewMembers(
        session.session.activeOrganizationId,
        dto.moduleType,
        dto.filter,
        pageOf(page),
        limitOf(limit),
        dto.audienceType
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/:id")
  async getGroup(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.groupService.getGroup(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/:id/members")
  async getGroupMembers(
    @Param("id") id: string,
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.groupService.getGroupMembers(
        id,
        session.session.activeOrganizationId,
        pageOf(page),
        limitOf(limit)
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["create"] })
  @Post("/")
  async createGroup(
    @Body() dto: CreateGroupDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.groupService.createGroup(
        dto,
        session.session.activeOrganizationId,
        session.user.id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Patch("/:id")
  async updateGroup(
    @Param("id") id: string,
    @Body() dto: UpdateGroupDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.groupService.updateGroup(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["delete"] })
  @Delete("/:id")
  async deleteGroup(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.groupService.deleteGroup(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}

function pageOf(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1;
}

function limitOf(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 25;
  return Math.min(Math.floor(parsed), PAGE_SIZE_CAP);
}
