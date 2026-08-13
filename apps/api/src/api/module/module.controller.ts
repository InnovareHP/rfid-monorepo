import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { EntitlementGuard } from "../../guard/entitlement/entitlement.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import { CreateModuleDto } from "./dto/module.dto";
import { ModuleService } from "./module.service";

@Controller("module")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard)
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
}
