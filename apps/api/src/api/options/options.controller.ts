import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { EntitlementGuard } from "../../guard/entitlement/entitlement.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { OptionsService } from "./options.service";

@Controller("options")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard)
export class OptionsController {
  constructor(private readonly optionsService: OptionsService) {}

  @RequirePermission({ record: ["read"] })
  @Get("/counties")
  async getCounties(
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      return await this.optionsService.getCounties(organizationId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/facility")
  async getFieldOptions(
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      const assignedTo = session.session.userId;
      return await this.optionsService.getFieldOptions(
        organizationId,
        assignedTo
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ record: ["read"] })
  @Get("/members")
  async getMemberOptions(
    @Query("isLiaison") isLiaison: string,
    @Session()
    session: AuthenticatedSession
  ) {
    try {
      const organizationId = session.session.activeOrganizationId;
      const isLiaisonValue = isLiaison === "true";

      return await this.optionsService.getMemberOptions(
        organizationId,
        isLiaisonValue
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
