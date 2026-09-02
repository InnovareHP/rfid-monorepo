import { createZodDto } from "nestjs-zod";
import {
  CreateBookingSchema,
  ReplaceAvailabilitySchema,
  ReschedulePublicBookingSchema,
  UpdateBookingPageSchema,
} from "./booking.dto";

export class UpdateBookingPageDto extends createZodDto(
  UpdateBookingPageSchema
) {}
export class ReplaceAvailabilityDto extends createZodDto(
  ReplaceAvailabilitySchema
) {}
export class CreateBookingDto extends createZodDto(CreateBookingSchema) {}
export class ReschedulePublicBookingDto extends createZodDto(
  ReschedulePublicBookingSchema
) {}
