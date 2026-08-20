import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { NotificationCategoryValue } from "@dashboard/shared";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { HipaaGuard } from "../../guard/hipaa/hipaa.guard";
import { SubscriptionGuard } from "../../guard/subscription/subscription.guard";
import { MarkReadDto } from "./dto/notification.schema";
import { NotificationService } from "./notification.service";

// Titles and bodies quote the records they came from, so these routes carry PHI
// and answer to the same compliance gate as the records themselves.
@Controller("notification")
@UseGuards(AuthGuard, SubscriptionGuard, HipaaGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getNotifications(
    @Session() session: MemberSession,
    @Query("unreadOnly") unreadOnly?: string,
    @Query("category") category?: NotificationCategoryValue,
    @Query("search") search?: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 20
  ) {
    try {
      return await this.notificationService.getNotifications(
        session.session.activeOrganizationId,
        session.session.memberId,
        {
          unreadOnly: unreadOnly === "true",
          category: category ?? "all",
          search: search?.trim() ?? "",
          page: Number(page),
          limit: Number(limit),
        }
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("stats")
  async getStats(@Session() session: MemberSession) {
    try {
      return await this.notificationService.getStats(
        session.session.activeOrganizationId,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("unread-count")
  async getUnreadCount(@Session() session: MemberSession) {
    try {
      return await this.notificationService.getUnreadCount(
        session.session.activeOrganizationId,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("read")
  async markRead(@Body() dto: MarkReadDto, @Session() session: MemberSession) {
    try {
      return await this.notificationService.markRead(
        dto.ids,
        session.session.activeOrganizationId,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("read-all")
  async markAllRead(@Session() session: MemberSession) {
    try {
      return await this.notificationService.markAllRead(
        session.session.activeOrganizationId,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("read")
  async clearRead(@Session() session: MemberSession) {
    try {
      return await this.notificationService.clearRead(
        session.session.activeOrganizationId,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Session() session: MemberSession) {
    try {
      return await this.notificationService.remove(
        id,
        session.session.activeOrganizationId,
        session.session.memberId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
