import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
} from "@nestjs/common";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import type { Request } from "express";
import { consumeSlidingLimit } from "../../lib/auth/sliding-limiter";
import {
  CompleteSignupDto,
  InvitationContextDto,
  SendMigrationOtpDto,
  SendSignupOtpDto,
  VerifyMigrationOtpDto,
  VerifySignupOtpDto,
} from "./dto/registration.schema";
import { RegistrationService } from "./registration.service";

// Unauthenticated by design: these are the only ways to obtain a first passkey.
@AllowAnonymous()
@Controller("registration")
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  private async limitPerIp(request: Request, scope: string) {
    const ip =
      (request.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
      request.ip ??
      "unknown";
    const limit = await consumeSlidingLimit({
      key: `registration:${scope}:${ip}`,
      limit: 10,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      throw new BadRequestException(
        `Too many attempts. Try again in ${limit.retryAfterSeconds} seconds.`
      );
    }
  }

  // The service already caps sends per mailbox; this caps one caller cycling
  // addresses, which is the spend and the enumeration budget.
  @Post("otp/send")
  async sendSignupOtp(@Body() dto: SendSignupOtpDto, @Req() request: Request) {
    await this.limitPerIp(request, "otp-send");
    return this.registrationService.sendSignupOtp(dto.email);
  }

  @Post("otp/complete")
  async completeSignup(
    @Body() dto: CompleteSignupDto,
    @Req() request: Request
  ) {
    await this.limitPerIp(request, "otp-verify");
    return this.registrationService.completeSignup(dto.context, dto.password);
  }

  @Post("otp/verify")
  async verifySignupOtp(
    @Body() dto: VerifySignupOtpDto,
    @Req() request: Request
  ) {
    await this.limitPerIp(request, "otp-verify");
    return this.registrationService.verifySignupOtp(
      dto.email,
      dto.name,
      dto.code
    );
  }

  @Post("invitation/context")
  async invitationContext(
    @Body() dto: InvitationContextDto,
    @Req() request: Request
  ) {
    await this.limitPerIp(request, "invitation-context");
    return this.registrationService.invitationContext(dto.invitationId);
  }

  @Post("migrate/send")
  async sendMigrationOtp(
    @Body() dto: SendMigrationOtpDto,
    @Req() request: Request
  ) {
    await this.limitPerIp(request, "migrate-send");
    return this.registrationService.sendMigrationOtp(dto.email);
  }

  @Post("migrate/verify")
  async verifyMigrationOtp(
    @Body() dto: VerifyMigrationOtpDto,
    @Req() request: Request
  ) {
    await this.limitPerIp(request, "migrate-verify");
    return this.registrationService.verifyMigrationOtp(dto.email, dto.code);
  }
}
