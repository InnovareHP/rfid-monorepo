import { createZodDto } from "nestjs-zod";
import {
  CreateBookingSchema,
  ReplaceAvailabilitySchema,
  UpdateBookingPageSchema,
} from "./booking.dto";

export class UpdateBookingPageDto extends createZodDto(
  UpdateBookingPageSchema
) {}
export class ReplaceAvailabilityDto extends createZodDto(
  ReplaceAvailabilitySchema
) {}
export class CreateBookingDto extends createZodDto(CreateBookingSchema) {}
