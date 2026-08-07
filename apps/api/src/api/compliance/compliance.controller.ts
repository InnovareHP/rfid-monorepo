import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  Session,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@thallesp/nestjs-better-auth";
import { Request, Response } from "express";
import {
  EntitlementGuard,
  RequireFeature,
} from "../../guard/entitlement/entitlement.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../guard/permission/permission.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import { clientIp } from "../../lib/http/client-ip";
import { ComplianceService, SignerContext } from "./compliance.service";
import {
  SignBaaDto,
  UpdateComplianceSettingsDto,
} from "./dto/compliance.schema";

// Org id always comes from the session. The signing routes additionally sit
// behind the plan flag, never the plan name.
@Controller("compliance")
@UseGuards(AuthGuard, SubscriptionGuard, PermissionGuard, EntitlementGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  private signer(
    session: FullSession,
    request: Request,
    email: string
  ): SignerContext {
    return {
      userId: session.session.userId,
      email,
      ipAddress: clientIp(request),
      userAgent: request.headers["user-agent"] ?? null,
    };
  }

  @RequirePermission({ compliance: ["read"] })
  @Get("settings")
  getSettings(@Session() session: MemberSession) {
    return this.complianceService.getStatus(
      session.session.activeOrganizationId
    );
  }

  @RequirePermission({ compliance: ["manage"] })
  @RequireFeature("hipaa")
  @Patch("settings")
  updateSettings(
    @Session() session: FullSession,
    @Req() request: Request,
    @Body() body: UpdateComplianceSettingsDto
  ) {
    return this.complianceService.updateSettings(
      session.session.activeOrganizationId,
      body,
      this.signer(session, request, session.user.email)
    );
  }

  @RequirePermission({ compliance: ["read"] })
  @Get("baa/terms")
  getTerms(@Session() session: MemberSession) {
    return this.complianceService.getTerms(
      session.session.activeOrganizationId
    );
  }

  // The blank addendum, so the signer reads the document rather than the
  // on-screen summary of it.
  @RequirePermission({ compliance: ["read"] })
  @Get("baa/document")
  async getBlankDocument(@Res() response: Response) {
    const document = await this.complianceService.getBlankDocument();
    response
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", 'inline; filename="hipaa-baa.pdf"')
      .send(document);
  }

  @RequirePermission({ compliance: ["manage"] })
  @RequireFeature("hipaa")
  @Post("baa/sign")
  sign(
    @Session() session: FullSession,
    @Req() request: Request,
    @Body() body: SignBaaDto
  ) {
    return this.complianceService.sign(
      session.session.activeOrganizationId,
      body,
      this.signer(session, request, session.user.email)
    );
  }

  // Streamed as bytes so no storage location ever reaches a client.
  @RequirePermission({ compliance: ["download"] })
  @Get("baa/document/signed")
  async getSignedDocument(
    @Session() session: MemberSession,
    @Res() response: Response
  ) {
    const document = await this.complianceService.getSignedDocument(
      session.session.activeOrganizationId
    );

    response
      .header("Content-Type", "application/pdf")
      .header(
        "Content-Disposition",
        'attachment; filename="hipaa-baa-executed.pdf"'
      )
      .send(document);
  }
}
