import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { ZodValidationPipe } from "nestjs-zod";
import { EntitlementGuard } from "../../guard/entitlement/entitlement.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import {
  CreateModuleGroupDto,
  ReorderModuleGroupsDto,
  UpdateModuleGroupDto,
} from "./dto/module-group.dto";
import { ModuleGroupService } from "./module-group.service";

// Its own prefix rather than /module/group, so "group" is never read as a
// module id by the /module/:id route.
@Controller("module-group")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard)
@UsePipes(ZodValidationPipe)
export class ModuleGroupController {
  constructor(private readonly moduleGroupService: ModuleGroupService) {}

  @RequirePermission({ record: ["read"] })
  @Get("/")
  async getGroups(@Session() session: AuthenticatedSession) {
    try {
      return await this.moduleGroupService.getGroups(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // A folder shapes the sidebar the same way a module does, so it sits behind
  // the same permission.
  @RequirePermission({ field: ["configure"] })
  @Post("/")
  async createGroup(
    @Body() dto: CreateModuleGroupDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.moduleGroupService.createGroup(
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Declared above /:id so "reorder" is not read as a group id.
  @RequirePermission({ field: ["configure"] })
  @Patch("/reorder")
  async reorderGroups(
    @Body() dto: ReorderModuleGroupsDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.moduleGroupService.reorderGroups(
        dto.groupIds,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ field: ["configure"] })
  @Patch("/:id")
  async updateGroup(
    @Param("id") id: string,
    @Body() dto: UpdateModuleGroupDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.moduleGroupService.updateGroup(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ field: ["configure"] })
  @Delete("/:id")
  async deleteGroup(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.moduleGroupService.deleteGroup(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
