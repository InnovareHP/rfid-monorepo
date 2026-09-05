import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import type { Request } from "express";
import { EntitlementGuard } from "../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../guard/hipaa/hipaa.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import { toSafeError } from "../../lib/errors/safe-error";
import { clientIp } from "../../lib/http/client-ip";
import { BoardExportService } from "./board-export.service";

// Same guard stack as BoardController: an export is a read of every record the
// caller could page through, so it must not be reachable on weaker terms.
@Controller("boards/export")
@UseGuards(
  AuthGuard,
  SubscriptionGuard,
  PermissionGuard,
  EntitlementGuard,
  HipaaGuard
)
export class BoardExportController {
  constructor(private readonly exportService: BoardExportService) {}

  @RequirePermission({ record: ["read"] })
  @Get("/")
  async exportCsv(
    @Session() session: MemberSession,
    @Req() req: Request,
    @Query("moduleType") moduleType?: string,
    @Query("filter") filtersQuery?: string,
    @Query("boardDateFrom") boardDateFrom?: string,
    @Query("boardDateTo") boardDateTo?: string,
    @Query("search") search?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: "asc" | "desc",
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    try {
      // One page of csv text per call; the client loops until hasMore is false.
      return await this.exportService.exportCsv(
        session.session.activeOrganizationId,
        {
          moduleType: moduleType ?? "LEAD",
          filter: filtersQuery ? JSON.parse(filtersQuery) : {},
          boardDateFrom,
          boardDateTo,
          search,
          sortBy,
          sortOrder,
          page: page ? Number(page) : 1,
          limit: limit ? Number(limit) : undefined,
        },
        {
          userId: session.user.id,
          role: session.session.memberRole ?? null,
          ip: clientIp(req),
        }
      );
    } catch (error) {
      throw toSafeError(error, "boards.export.exportCsv");
    }
  }
}
