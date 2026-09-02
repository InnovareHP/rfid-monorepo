import { ROLES } from "@dashboard/shared";
import {
  BadRequestException,
  HttpException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  Session,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, Roles, UserSession } from "@thallesp/nestjs-better-auth";
import type { Request, Response } from "express";
import { OnboardingGuard } from "src/guard/onboarding/onboarding.guard";
import {
  AdminEntitlementDto,
  CreateAdminUserDto,
  OnboardingDto,
} from "./dto/user.schema";
import { UserService } from "./user.service";

// Bounds the export path, which asks for the whole filtered log in one page.
const ACTIVITY_LOG_MAX_TAKE = 5000;

@Controller("user")
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Both streams below report their own failures as a final event, so the
  // client never has to tell a dropped connection from a rejected call.
  private async streamEvents<T extends { type: string }>(
    response: Response,
    events: AsyncGenerator<T>,
    failureMessage: string
  ) {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();

    const send = (event: T | { type: "error"; message: string }) =>
      response.write(`data: ${JSON.stringify(event)}\n\n`);

    try {
      for await (const event of events) {
        send(event);
      }
    } catch (error) {
      send({
        type: "error",
        message: error instanceof Error ? error.message : failureMessage,
      });
    } finally {
      response.end();
    }
  }

  @Post("onboarding")
  @UseGuards(OnboardingGuard)
  async onboarding(
    @Body() onboardDto: OnboardingDto,
    @Session() session: UserSession,
    @Req() request: Request,
    @Res() response: Response
  ) {
    await this.streamEvents(
      response,
      this.userService.onboarding(
        onboardDto,
        session.user.id,
        new Headers({ cookie: request.headers.cookie ?? "" })
      ),
      "Onboarding failed"
    );
  }

  // Creates the account and its organization in one call. The owner enrols a
  // passkey from the login page, and the organization stays unsubscribed until
  // they check out, exactly as a self-serve signup would.
  @Post("admin/users")
  @Roles([ROLES.SUPER_ADMIN])
  async createAdminUser(
    @Body() dto: CreateAdminUserDto,
    @Session() session: UserSession,
    @Res() response: Response
  ) {
    await this.streamEvents(
      response,
      this.userService.createAdminUser(dto, {
        id: session.user.id,
        name: session.user.name,
      }),
      "Could not create the user"
    );
  }

  @Get("admin/users")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminUsers(
    @Query("page") page: number = 1,
    @Query("take") take: number = 10,
    @Query("search") search?: string,
    @Query("roleFilter") roleFilter?: string,
    @Query("statusFilter") statusFilter?: string,
    @Query("verifiedFilter") verifiedFilter?: string,
    @Query("membershipFilter") membershipFilter?: string
  ) {
    try {
      return await this.userService.getAdminUsers({
        page: Number(page),
        take: Number(take),
        search,
        roleFilter,
        statusFilter,
        verifiedFilter,
        membershipFilter,
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get("admin/users/:userId")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminUserById(@Param("userId") userId: string) {
    try {
      return await this.userService.getAdminUserById(userId);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get("admin/activity-log")
  @Roles([ROLES.SUPER_ADMIN])
  async getActivityLog(
    @Query("page") page: number = 1,
    @Query("take") take: number = 20,
    @Query("actionFilter") actionFilter?: string,
    @Query("adminId") adminId?: string,
    @Query("search") search?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string
  ) {
    try {
      return await this.userService.getActivityLog({
        page: Number(page),
        take: Math.min(Number(take), ACTIVITY_LOG_MAX_TAKE),
        actionFilter,
        adminId,
        search,
        startDate,
        endDate,
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get("admin/metrics")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminMetrics() {
    try {
      return await this.userService.getAdminMetrics();
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get("admin/organizations")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminOrganizations(
    @Query("page") page: number = 1,
    @Query("take") take: number = 10,
    @Query("search") search?: string,
    @Query("hipaaOnly") hipaaOnly?: string,
    @Query("accessFilter") accessFilter?: string,
    @Query("contractFilter") contractFilter?: string
  ) {
    try {
      return await this.userService.getAdminOrganizations({
        page: Number(page),
        take: Number(take),
        search,
        hipaaOnly: hipaaOnly === "true",
        accessFilter,
        contractFilter,
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Get("admin/organizations/:orgId")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminOrganizationById(@Param("orgId") orgId: string) {
    try {
      return await this.userService.getAdminOrganizationById(orgId);
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  @Patch("admin/organizations/:orgId/entitlement")
  @Roles([ROLES.SUPER_ADMIN])
  async setAdminOrganizationEntitlement(
    @Param("orgId") orgId: string,
    @Body() body: AdminEntitlementDto,
    @Session() session: UserSession
  ) {
    return await this.userService.setAdminOrganizationEntitlement(
      session.user.id,
      session.user.name,
      orgId,
      body
    );
  }

  @Post("admin/organizations/:orgId/contract-invoice")
  @Roles([ROLES.SUPER_ADMIN])
  async issueAdminContractInvoice(
    @Param("orgId") orgId: string,
    @Session() session: UserSession
  ) {
    try {
      return await this.userService.issueAdminContractInvoice(
        session.user.id,
        session.user.name,
        orgId
      );
    } catch (error) {
      // Rethrown as-is when the service already said why; anything else would
      // otherwise reach the client as a bare 500.
      if (error instanceof HttpException) throw error;
      throw new BadRequestException(
        error instanceof Error ? error.message : "Could not issue the invoice"
      );
    }
  }

  @Get("admin/organizations/:orgId/baa")
  @Roles([ROLES.SUPER_ADMIN])
  async getAdminOrganizationBaa(
    @Param("orgId") orgId: string,
    @Res() response: Response
  ) {
    const { document, termsVersion } =
      await this.userService.getAdminOrganizationBaa(orgId);

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="baa-${orgId}-${termsVersion}.pdf"`
    );
    response.send(document);
  }
}
