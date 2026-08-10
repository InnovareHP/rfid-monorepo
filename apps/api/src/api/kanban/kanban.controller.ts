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
import { EntitlementGuard } from "../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../guard/hipaa/hipaa.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { UpdateKanbanStagesDto } from "./dto/kanban.schema";
import { KanbanService } from "./kanban.service";

@Controller("kanban")
@UseGuards(
  AuthGuard,
  SubscriptionGuard,
  PermissionGuard,
  EntitlementGuard,
  HipaaGuard
)
export class KanbanController {
  constructor(private readonly kanbanService: KanbanService) {}

  @RequirePermission({ analytics: ["read"] })
  @Get("/")
  async getKanban(
    @Session() session: AuthenticatedSession,
    @Query("moduleType") moduleType?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    try {
      return await this.kanbanService.getKanban(
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
      return await this.kanbanService.getWinLoss(
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
      return await this.kanbanService.getConfig(
        session.session.activeOrganizationId,
        moduleType || "LEAD"
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/stages")
  @RequirePermission({ field: ["configure"] })
  async updateStages(
    @Session() session: AuthenticatedSession,
    @Body() dto: UpdateKanbanStagesDto
  ) {
    try {
      return await this.kanbanService.updateStages(
        session.session.activeOrganizationId,
        dto
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
