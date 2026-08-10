import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Session,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, UserSession } from "@thallesp/nestjs-better-auth";
import type { Request } from "express";
import { AdminRoleGuard } from "../../guard/role/role.guard";
import { ResetMemberPasskeysDto } from "./dto/passkeys.schema";
import { PasskeysService } from "./passkeys.service";

@Controller("passkeys")
@UseGuards(AuthGuard)
export class PasskeysController {
  constructor(private readonly passkeysService: PasskeysService) {}

  @Get()
  async list(@Session() session: UserSession) {
    return this.passkeysService.listOwnPasskeys(session.user.id);
  }

  @Get("prompt")
  async prompt(@Session() session: UserSession) {
    return this.passkeysService.getPasskeyPrompt(session.user.id);
  }

  @Post("prompt/waive")
  async waivePrompt(@Session() session: UserSession) {
    return this.passkeysService.waivePasskeyPrompt(session.user.id);
  }

  @Post("enrollment-code")
  async createEnrollmentCode(@Session() session: UserSession) {
    return this.passkeysService.createEnrollmentCode(
      session.user.id,
      session.user.email
    );
  }

  @Delete(":passkeyId")
  async remove(
    @Session() session: UserSession,
    @Param("passkeyId") passkeyId: string
  ) {
    return this.passkeysService.removeOwnPasskey(session.user.id, passkeyId);
  }

  @Post("members/:memberId/reset")
  @UseGuards(AdminRoleGuard)
  async resetMemberPasskeys(
    @Session() session: MemberSession,
    @Req() request: Request,
    @Param("memberId") memberId: string,
    @Body() dto: ResetMemberPasskeysDto
  ) {
    return this.passkeysService.resetMemberPasskeys(
      {
        userId: session.user.id,
        organizationId: session.session.activeOrganizationId,
        role: session.session.memberRole,
        ip:
          (request.headers["x-forwarded-for"] as string)
            ?.split(",")[0]
            ?.trim() ??
          request.ip ??
          null,
        userAgent: request.headers["user-agent"] ?? null,
      },
      memberId,
      dto.reason
    );
  }
}
