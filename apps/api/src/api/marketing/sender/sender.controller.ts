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
import { EntitlementGuard } from "../../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../../guard/hipaa/hipaa.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../../guard/permission/permission.guard";
import { SubscriptionGuard } from "../../../guard/subscription/subscription.guard";
import { CreateSenderDto, UpdateSenderDto } from "./dto/sender.dto";
import { SenderService } from "./sender.service";

@Controller("marketing/senders")
@UseGuards(
  AuthGuard,
  SubscriptionGuard,
  PermissionGuard,
  EntitlementGuard,
  HipaaGuard
)
export class SenderController {
  constructor(private readonly senderService: SenderService) {}

  @RequirePermission({ outreach: ["read"] })
  @Get("/")
  async getSenders(@Session() session: AuthenticatedSession) {
    try {
      return await this.senderService.getSenders(
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["read"] })
  @Get("/:id")
  async getSender(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.senderService.getSender(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["create"] })
  @Post("/")
  async createSender(
    @Body() dto: CreateSenderDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.senderService.createSender(
        dto,
        session.session.activeOrganizationId,
        session.user.id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Post("/:id/verify")
  async verifySender(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.senderService.refreshVerification(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Patch("/:id")
  async updateSender(
    @Param("id") id: string,
    @Body() dto: UpdateSenderDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.senderService.updateSender(
        id,
        dto,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["delete"] })
  @Delete("/:id")
  async deleteSender(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.senderService.deleteSender(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
