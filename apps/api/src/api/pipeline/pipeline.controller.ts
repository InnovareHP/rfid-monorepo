import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import {
  EntitlementGuard,
  RequireFeature,
} from "../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../guard/hipaa/hipaa.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import {
  SetPipelineConfigDto,
  UpdatePipelineStagesDto,
} from "./dto/pipeline.schema";
import { PipelineService } from "./pipeline.service";

@Controller("pipeline")
@UseGuards(
  AuthGuard,
  SubscriptionGuard,
  PermissionGuard,
  EntitlementGuard,
  HipaaGuard
)
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @RequirePermission({ analytics: ["read"] })
  @Get("/")
  async getPipeline(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    try {
      return await this.pipelineService.getPipeline(
        session.session.activeOrganizationId,
        moduleType || "LEAD",
        { from, to }
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["read"] })
  @Get("/win-loss")
  async getWinLoss(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    try {
      return await this.pipelineService.getWinLoss(
        session.session.activeOrganizationId,
        moduleType || "LEAD",
        { from, to }
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["read"] })
  @Get("/config")
  async getConfig(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string
  ) {
    try {
      return await this.pipelineService.getConfig(
        session.session.activeOrganizationId,
        moduleType || "LEAD"
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/config")
  @RequirePermission({ field: ["configure"] })
  async setConfig(
    @Session() session: AuthenticatedSession,
    @Body() dto: SetPipelineConfigDto
  ) {
    try {
      return await this.pipelineService.setConfig(
        session.session.activeOrganizationId,
        dto
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/stages")
  @RequirePermission({ field: ["configure"] })
  async updateStages(
    @Session() session: AuthenticatedSession,
    @Body() dto: UpdatePipelineStagesDto
  ) {
    try {
      return await this.pipelineService.updateStages(
        session.session.activeOrganizationId,
        dto
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
