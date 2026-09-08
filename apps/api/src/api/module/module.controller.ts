import {
  BadRequestException,
  Body,
  Controller,
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
  CreateModuleDto,
  ReorderModulesDto,
  UpdateModuleDto,
} from "./dto/module.dto";
import { ModuleService } from "./module.service";

@Controller("module")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard)
@UsePipes(ZodValidationPipe)
export class ModuleController {
  constructor(private readonly moduleService: ModuleService) {}

  @RequirePermission({ record: ["read"] })
  @Get("/")
  async getModules(
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      return await this.moduleService.getModules(organizationId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Creating a module shapes the schema, so it sits behind field configure
  // rather than record create.
  @RequirePermission({ field: ["configure"] })
  @Post("/")
  async createModule(
    @Body() dto: CreateModuleDto,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      return await this.moduleService.createModule(dto, organizationId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Declared above /:id so "reorder" is not read as a module id.
  @RequirePermission({ field: ["configure"] })
  @Patch("/reorder")
  async reorderModules(
    @Body() dto: ReorderModulesDto,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.moduleService.reorderModules(
        dto.moduleIds,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ field: ["configure"] })
  @Patch("/:id")
  async updateModule(
    @Param("id") id: string,
    @Body() dto: UpdateModuleDto,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      return await this.moduleService.updateModule(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
