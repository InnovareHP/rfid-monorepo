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
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import {
  EntitlementGuard,
  RequireFeature,
} from "../../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../../guard/hipaa/hipaa.guard";
import { SubscriptionGuard } from "../../../guard/subscription/subscription.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../../guard/permission/permission.guard";
import {
  CreateLandingPageDto,
  UpdateLandingPageDto,
} from "./dto/landing-page.dto";
import { LandingPageService } from "./landing-page.service";

@Controller("marketing/landing-pages")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard, HipaaGuard)
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @RequirePermission({ outreach: ["read"] })
  @Get("/")
  async listLandingPages(@Session() session: AuthenticatedSession) {
    try {
      return await this.landingPageService.listLandingPages(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/:id")
  async getLandingPage(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.landingPageService.getLandingPage(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["create"] })
  @Post("/")
  async createLandingPage(
    @Body() dto: CreateLandingPageDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.landingPageService.createLandingPage(
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
  async updateLandingPage(
    @Param("id") id: string,
    @Body() dto: UpdateLandingPageDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.landingPageService.updateLandingPage(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Post("/:id/publish")
  async publishLandingPage(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.landingPageService.publishLandingPage(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["delete"] })
  @Delete("/:id")
  async deleteLandingPage(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.landingPageService.deleteLandingPage(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
