import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
} from "@nestjs/common";
import { SubscriberStatus } from "@prisma/client";
import { Throttle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { CrossTenant } from "../../../filter/tenant-context";
import { PublicSubscribeDto } from "./dto/subscriber.dto";
import { SubscriberService } from "./subscriber.service";

// Reached from an email footer, so it never requires a session and must never
// 401 - the frontend's auth interceptor would bounce the reader to /login.
@Controller("marketing/public")
@CrossTenant()
@AllowAnonymous()
export class SubscriberPublicController {
  constructor(private readonly subscriberService: SubscriberService) {}

  @Get("/unsubscribe/:token")
  async getSubscription(@Param("token") token: string) {
    try {
      return await this.subscriberService.getByToken(token);
    } catch (error) {
      throw this.toPublicError(error);
    }
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post("/unsubscribe/:token")
  async unsubscribe(@Param("token") token: string) {
    try {
      return await this.subscriberService.setStatusByToken(
        token,
        SubscriberStatus.UNSUBSCRIBED
      );
    } catch (error) {
      throw this.toPublicError(error);
    }
  }

  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post("/unsubscribe/:token/resubscribe")
  async resubscribe(@Param("token") token: string) {
    try {
      return await this.subscriberService.setStatusByToken(
        token,
        SubscriberStatus.SUBSCRIBED
      );
    } catch (error) {
      throw this.toPublicError(error);
    }
  }

  @Get("/subscribe/:token")
  async getSubscribeTarget(@Param("token") token: string) {
    try {
      return await this.subscriberService.getSubscribeTarget(token);
    } catch (error) {
      throw this.toPublicError(error);
    }
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("/subscribe/:token")
  async subscribe(
    @Param("token") token: string,
    @Body() dto: PublicSubscribeDto
  ) {
    try {
      return await this.subscriberService.subscribeByToken(token, {
        email: dto.email,
        name: dto.name,
      });
    } catch (error) {
      throw this.toPublicError(error);
    }
  }

  // Never let internal/Prisma error details reach an anonymous caller.
  private toPublicError(error: unknown): HttpException {
    if (error instanceof HttpException) return error;

    return new BadRequestException("Invalid request");
  }
}
