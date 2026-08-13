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
} from "../../guard/entitlement/entitlement.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import { SaveReportDto, UpdateReportDto } from "./dto/report.dto";
import { ReportService } from "./report.service";

// Saved reports are the Scale tier's custom reporting, so the whole controller
// sits behind that feature rather than gating each route.
@Controller("report")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard)
@RequireFeature("custom_reporting")
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @RequirePermission({ report: ["read"] })
  @Get("/")
  async getReports(@Session() session: AuthenticatedSession) {
    try {
      return await this.reportService.getReports(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ report: ["read"] })
  @Get("/:id/run")
  async runReport(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.reportService.runReport(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ report: ["export"] })
  @Post("/")
  async createReport(
    @Body() dto: SaveReportDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.reportService.createReport(
        dto,
        session.session.activeOrganizationId,
        session.session.userId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ report: ["export"] })
  @Patch("/:id")
  async updateReport(
    @Param("id") id: string,
    @Body() dto: UpdateReportDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.reportService.updateReport(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ report: ["export"] })
  @Delete("/:id")
  async deleteReport(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.reportService.deleteReport(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
