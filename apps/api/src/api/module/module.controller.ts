import {
  BadRequestException,
  Controller,
  Get,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { EntitlementGuard } from "../../guard/entitlement/entitlement.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
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
}
