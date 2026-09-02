import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { CalendarModule } from "../calendar/calendar.module";
import { NotificationModule } from "../notification/notification.module";
import { BookingPublicController } from "./booking-public.controller";
import { BookingController } from "./booking.controller";
import { BookingReminderProcessor } from "./booking-reminder.processor";
import { BookingReminderService } from "./booking-reminder.service";
import { BookingService } from "./booking.service";

@Module({
  imports: [
    CalendarModule,
    NotificationModule,
    BullModule.registerQueue({ name: QUEUE_NAMES.BOOKING_REMINDER }),
  ],
  controllers: [BookingController, BookingPublicController],
  providers: [BookingService, BookingReminderService, BookingReminderProcessor],
  // The demo module books through this rather than duplicating calendar sync.
  exports: [BookingService],
})
export class BookingModule {}
