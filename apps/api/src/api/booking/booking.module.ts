import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { BookingPublicController } from "./booking-public.controller";
import { BookingController } from "./booking.controller";
import { BookingService } from "./booking.service";

@Module({
  imports: [CalendarModule],
  controllers: [BookingController, BookingPublicController],
  providers: [BookingService],
})
export class BookingModule {}
