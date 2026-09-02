import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  UsePipes,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { ZodValidationPipe } from "nestjs-zod";
import { CrossTenant } from "../../filter/tenant-context";
import { DemoService } from "./demo.service";
import { BookDemoDto, CreateDemoRequestDto } from "./dto/demo.schema";

// The landing site is the only caller. Demo rows are product-level, so the
// tenant scope is explicitly crossed rather than absent.
@Controller("demo")
@CrossTenant()
@AllowAnonymous()
@UsePipes(ZodValidationPipe)
export class DemoPublicController {
  constructor(private readonly demoService: DemoService) {}

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("requests")
  async createRequest(@Body() dto: CreateDemoRequestDto) {
    try {
      return await this.demoService.createRequest(dto);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get("requests/:id/slots")
  async getSlots(@Param("id") id: string, @Query("date") date: string) {
    try {
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException("date must be in YYYY-MM-DD format");
      }
      return await this.demoService.getSlots(id, date);
    } catch (error) {
      this.rethrow(error);
    }
  }

  // Feeds the calendar: which days have anything free, so a visitor never
  // clicks into an empty day.
  @Get("requests/:id/availability")
  async getAvailableDays(
    @Param("id") id: string,
    @Query("month") month: string
  ) {
    try {
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new BadRequestException("month must be in YYYY-MM format");
      }
      return await this.demoService.getAvailableDays(id, month);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("requests/:id/book")
  async book(@Param("id") id: string, @Body() dto: BookDemoDto) {
    try {
      return await this.demoService.book(
        id,
        dto.startTime,
        dto.inviteeTimezone
      );
    } catch (error) {
      this.rethrow(error);
    }
  }

  // Same reasoning as the public booking controller: keep the status an
  // anonymous caller needs (404, 409) and never echo an unexpected message.
  private rethrow(error: unknown): never {
    if (error instanceof HttpException) throw error;
    throw new BadRequestException("Invalid request");
  }
}
