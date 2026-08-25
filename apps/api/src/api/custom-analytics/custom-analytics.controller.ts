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
  UsePipes,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { ZodValidationPipe } from "nestjs-zod";
import {
  EntitlementGuard,
  RequireFeature,
} from "../../guard/entitlement/entitlement.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import { CustomAnalyticsService } from "./custom-analytics.service";
import {
  ReorderDashboardChartsDto,
  SaveDashboardDto,
  UpdateDashboardDto,
} from "./dto/custom-analytic-dashboard.dto";
import {
  PreviewCustomAnalyticDto,
  RunCustomAnalyticQueryDto,
  RunDashboardQueryDto,
  SaveCustomAnalyticDto,
  UpdateCustomAnalyticDto,
} from "./dto/custom-analytics.dto";

function toDateWindow(query: { startDate?: string; endDate?: string }) {
  return query.startDate && query.endDate
    ? { start: new Date(query.startDate), end: new Date(query.endDate) }
    : null;
}

// Custom analytics is the Scale tier's build-your-own chart feature, same
// entitlement as the sibling Custom Reports.
@Controller("custom-analytics")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard)
@UsePipes(ZodValidationPipe)
@RequireFeature("custom_reporting")
export class CustomAnalyticsController {
  constructor(
    private readonly customAnalyticsService: CustomAnalyticsService
  ) {}

  @RequirePermission({ analytics: ["read"] })
  @Get("/")
  async getAll(@Session() session: AuthenticatedSession) {
    try {
      return await this.customAnalyticsService.getAnalytics(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["read"] })
  @Get("/:id/run")
  async run(
    @Param("id") id: string,
    @Query() query: RunCustomAnalyticQueryDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.runAnalytic(
        id,
        session.session.activeOrganizationId,
        toDateWindow(query)
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Ad hoc, unsaved run for the builder's live preview.
  @RequirePermission({ analytics: ["read"] })
  @Post("/preview")
  async preview(
    @Body() dto: PreviewCustomAnalyticDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.previewAnalytic(
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["manage"] })
  @Post("/")
  async create(
    @Body() dto: SaveCustomAnalyticDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.createAnalytic(
        dto,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["manage"] })
  @Patch("/:id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCustomAnalyticDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.updateAnalytic(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["manage"] })
  @Delete("/:id")
  async remove(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.deleteAnalytic(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // -- Dashboards: named groupings of existing saved charts. --

  @RequirePermission({ analytics: ["read"] })
  @Get("/dashboards")
  async getDashboards(@Session() session: AuthenticatedSession) {
    try {
      return await this.customAnalyticsService.getDashboards(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["read"] })
  @Get("/dashboards/:id")
  async getDashboard(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.getDashboard(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["read"] })
  @Get("/dashboards/:id/run")
  async runDashboard(
    @Param("id") id: string,
    @Query() query: RunDashboardQueryDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.runDashboard(
        id,
        session.session.activeOrganizationId,
        toDateWindow(query),
        query.limit ?? null
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["manage"] })
  @Post("/dashboards")
  async createDashboard(
    @Body() dto: SaveDashboardDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.createDashboard(
        dto,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["manage"] })
  @Patch("/dashboards/:id")
  async updateDashboard(
    @Param("id") id: string,
    @Body() dto: UpdateDashboardDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.updateDashboard(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Ordering is a management operation on the dashboard, not a read, so it
  // carries the same permission as create/update/delete.
  @RequirePermission({ analytics: ["manage"] })
  @Patch("/dashboards/:id/reorder")
  async reorderDashboardCharts(
    @Param("id") id: string,
    @Body() dto: ReorderDashboardChartsDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.reorderDashboardCharts(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ analytics: ["manage"] })
  @Delete("/dashboards/:id")
  async removeDashboard(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.deleteDashboard(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
