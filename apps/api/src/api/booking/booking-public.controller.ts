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
import { CrossTenant } from "../../filter/tenant-context";
import { ZodValidationPipe } from "nestjs-zod";
import { BookingService } from "./booking.service";
import {
  CreateBookingDto,
  ReschedulePublicBookingDto,
} from "./dto/booking.schema";

@Controller("booking/public")
@CrossTenant()
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

  // The only anonymous write here, and it puts a row and a mail behind it, so it
  // sits well under the global ceiling.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
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

  // The booking id is the credential, so these are throttled like the create
  // path rather than left open to enumeration.
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Get("/bookings/:id")
  async getBooking(@Param("id") id: string) {
    try {
      return await this.bookingService.getPublicBooking(id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("/bookings/:id/cancel")
  async cancelBooking(@Param("id") id: string) {
    try {
      return await this.bookingService.cancelPublicBooking(id);
    } catch (error) {
      this.rethrow(error);
    }
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("/bookings/:id/reschedule")
  async rescheduleBooking(
    @Param("id") id: string,
    @Body() dto: ReschedulePublicBookingDto
  ) {
    try {
      return await this.bookingService.reschedulePublicBooking(
        id,
        dto.startTime
      );
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
