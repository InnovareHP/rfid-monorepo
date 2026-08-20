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
} from "@nestjs/common";
import { SubscriberStatus } from "@prisma/client";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { EntitlementGuard } from "../../../guard/entitlement/entitlement.guard";
import { HipaaGuard } from "../../../guard/hipaa/hipaa.guard";
import {
  PermissionGuard,
  RequirePermission,
} from "../../../guard/permission/permission.guard";
import { SubscriptionGuard } from "../../../guard/subscription/subscription.guard";
import { CreateSubscriberDto, ListSubscribersDto } from "./dto/subscriber.dto";
import { SubscriberService } from "./subscriber.service";

@Controller("marketing/subscribers")
@UseGuards(
  AuthGuard,
  SubscriptionGuard,
  PermissionGuard,
  EntitlementGuard,
  HipaaGuard
)
export class SubscriberController {
  constructor(private readonly subscriberService: SubscriberService) {}

  @RequirePermission({ outreach: ["read"] })
  @Get("/")
  async list(
    @Query() query: ListSubscribersDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.subscriberService.list(
        session.session.activeOrganizationId,
        query
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["create"] })
  @Post("/")
  async create(
    @Body() dto: CreateSubscriberDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.subscriberService.create(
        session.session.activeOrganizationId,
        dto
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Patch("/:id/unsubscribe")
  async unsubscribe(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.subscriberService.setStatus(
        id,
        session.session.activeOrganizationId,
        SubscriberStatus.UNSUBSCRIBED
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Patch("/:id/resubscribe")
  async resubscribe(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.subscriberService.setStatus(
        id,
        session.session.activeOrganizationId,
        SubscriberStatus.SUBSCRIBED
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["update"] })
  @Patch("/:id/record/:recordId")
  async linkToRecord(
    @Param("id") id: string,
    @Param("recordId") recordId: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.subscriberService.linkToRecord(
        id,
        session.session.activeOrganizationId,
        recordId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @RequirePermission({ outreach: ["delete"] })
  @Delete("/:id")
  async remove(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.subscriberService.remove(
        id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
