import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
  UsePipes,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import { ZodValidationPipe } from "nestjs-zod";
import { BookingService } from "./booking.service";
import {
  ReplaceAvailabilityDto,
  UpdateBookingPageDto,
} from "./dto/booking.schema";

@Controller("booking")
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get("/me")
  async getOwnPage(@Session() session: AuthenticatedSession) {
    try {
      return await this.bookingService.getOrCreateOwnPage(
        session.user.id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Patch("/me")
  async updateOwnPage(
    @Body() dto: UpdateBookingPageDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.bookingService.updateOwnPage(
        session.user.id,
        session.session.activeOrganizationId,
        dto
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/me/availability")
  async getOwnAvailability(@Session() session: AuthenticatedSession) {
    try {
      return await this.bookingService.getOwnAvailability(
        session.user.id,
        session.session.activeOrganizationId
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Put("/me/availability")
  async replaceOwnAvailability(
    @Body() dto: ReplaceAvailabilityDto,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.bookingService.replaceOwnAvailability(
        session.user.id,
        session.session.activeOrganizationId,
        dto.rules
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Get("/bookings")
  async listBookings(
    @Session() session: AuthenticatedSession,
    @Query("page") page = 1,
    @Query("limit") limit = 20
  ) {
    try {
      return await this.bookingService.listOwnBookings(
        session.user.id,
        session.session.activeOrganizationId,
        Math.max(1, Number(page) || 1),
        Math.min(100, Math.max(1, Number(limit) || 20))
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Delete("/bookings/:id")
  async cancelBooking(
    @Param("id") id: string,
    @Session() session: AuthenticatedSession
  ) {
    try {
      return await this.bookingService.cancelOwnBooking(
        session.user.id,
        session.session.activeOrganizationId,
        id
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
