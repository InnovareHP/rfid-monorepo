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
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { ZodValidationPipe } from "nestjs-zod";
import { BookingService } from "./booking.service";
import { CreateBookingDto } from "./dto/booking.schema";

@Controller("booking/public")
@AllowAnonymous()
@UsePipes(ZodValidationPipe)
export class BookingPublicController {
  constructor(private readonly bookingService: BookingService) {}

  @Get("/:slug")
  async getPage(@Param("slug") slug: string) {
    try {
      return await this.bookingService.getPublicPage(slug);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Get("/:slug/slots")
  async getSlots(@Param("slug") slug: string, @Query("date") date: string) {
    try {
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException("date must be in YYYY-MM-DD format");
      }
      return await this.bookingService.getPublicSlots(slug, date);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Post("/:slug/bookings")
  async createBooking(
    @Param("slug") slug: string,
    @Body() dto: CreateBookingDto
  ) {
    try {
      return await this.bookingService.createPublicBooking(slug, dto);
    } catch (error) {
      this.rethrow(error);
    }
  }

  // Preserves the original HTTP status (404, 409) instead of collapsing every
  // service error into a generic 400, since callers need to distinguish them.
  // Anything that isn't an HttpException we explicitly threw is an unexpected
  // failure (Prisma error, RangeError, etc.) — never echo its raw message to
  // an anonymous caller, that's exactly what AllExceptionsFilter redacts for 5xx.
  private rethrow(error: unknown): never {
    if (error instanceof HttpException) throw error;
    throw new BadRequestException("Invalid request");
  }
}
