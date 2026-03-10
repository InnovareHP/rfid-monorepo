import { Module } from "@nestjs/common";
import { CalendarController } from "./calendar.controller";
import { CalendarOAuthCallbackController } from "./calendar-oauth-callback.controller";
import { GoogleCalendarService } from "./google-calendar.service";
import { OutlookCalendarService } from "./outlook-calendar.service";

@Module({
  controllers: [CalendarOAuthCallbackController, CalendarController],
  providers: [GoogleCalendarService, OutlookCalendarService],
})
export class CalendarModule {}
