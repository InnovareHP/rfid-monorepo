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
  Res,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import type { Response } from "express";
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
  async getAll(
    @Session() session: AuthenticatedSession,
    @Query("moduleKey") moduleKey?: string,
    @Query("unfiled") unfiled?: string
  ) {
    try {
      return await this.customAnalyticsService.getAnalytics(
        session.session.activeOrganizationId,
        moduleKey,
        unfiled === "true"
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

  // Declared before /dashboards/:id — Nest matches in order, so "default"
  // would otherwise be read as a dashboard id.
  @RequirePermission({ analytics: ["read"] })
  @Get("/dashboards/default")
  async getDefaultDashboard(
    @Query("moduleKey") moduleKey: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.getDefaultDashboard(
        moduleKey,
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

  // Charts print as the numbers behind them: the document carries the
  // letterhead and selectable text, which a screenshot of the canvas would not.
  @RequirePermission({ analytics: ["read"] })
  @Get("/dashboards/:id/pdf")
  async dashboardPdf(
    @Param("id") id: string,
    @Query() query: RunDashboardQueryDto,
    @Session() session: AuthenticatedSession,
    @Res() response: Response
  ) {
    const window = toDateWindow(query);
    const pdf = await this.customAnalyticsService.renderDashboardPdf(
      id,
      session.session.activeOrganizationId,
      window
    );

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="dashboard-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf"`
    );
    response.send(pdf);
  }

  // A POST because generating an insight is a model call, not a cached read.
  @RequirePermission({ analytics: ["read"] })
  @Post("/dashboards/:id/insights")
  async dashboardInsights(
    @Param("id") id: string,
    @Query() query: RunDashboardQueryDto,
    @Query("force") force: string | undefined,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.getDashboardInsights(
        id,
        session.session.activeOrganizationId,
        toDateWindow(query),
        force === "true"
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  // Declared after every /dashboards route: Nest matches in order, so a
  // bare :id placed earlier would capture "dashboards" itself.
  @RequirePermission({ analytics: ["read"] })
  @Get("/:id")
  async getOne(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.customAnalyticsService.getAnalytic(
        id,
        session.session.activeOrganizationId
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
