import { entitlementHasFeature } from "@dashboard/shared";
import {
  BadRequestException,
  Controller,
  Get,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import type { Request } from "express";
import { EntitlementGuard } from "../../guard/entitlement/entitlement.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import {
  SubscriptionGuard,
  type OrganizationEntitlement,
} from "../../guard/subscription/subscription.guard";
import { CustomAnalyticsService } from "../custom-analytics/custom-analytics.service";
import { ModuleGroupService } from "../module/module-group.service";
import { ModuleService } from "../module/module.service";

// The sidebar needs the module tree and the dashboard rows on every mount. They
// used to be two requests that also raced each other; one call keeps the nav
// from rendering half its entries.
@Controller("nav")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard)
export class NavController {
  constructor(
    private readonly moduleService: ModuleService,
    private readonly moduleGroupService: ModuleGroupService,
    private readonly customAnalyticsService: CustomAnalyticsService
  ) {}

  @RequirePermission({ record: ["read"] })
  @Get("/")
  async getNav(
    @Session() session: AuthenticatedSession,
    @Req() request: Request
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      const entitlement = (
        request as Request & { entitlement?: OrganizationEntitlement }
      ).entitlement;

      // Dashboards are the Scale tier's feature, so an unentitled organization
      // gets the empty list rather than a 403 that would take the whole nav
      // down with it.
      const canUseCustomReporting = entitlement
        ? entitlementHasFeature(entitlement, "custom_reporting")
        : false;

      // Groups ride along because an empty folder has no module to infer it
      // from, and the sidebar still has to draw it.
      const [modules, groups, dashboards] = await Promise.all([
        this.moduleService.getModules(organizationId),
        this.moduleGroupService.getGroups(organizationId),
        canUseCustomReporting
          ? this.customAnalyticsService.getDashboards(organizationId)
          : [],
      ]);

      return { modules, groups, dashboards };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
