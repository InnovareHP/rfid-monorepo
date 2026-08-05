import { Module } from "@nestjs/common";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { BoardModule } from "./board/board.module";
import { BookingModule } from "./booking/booking.module";
import { CalendarModule } from "./calendar/calendar.module";
import { EmailModule } from "./email/email.module";
import { FaxModule } from "./fax/fax.module";
import { ImageModule } from "./image/image.module";
import { LiaisonModule } from "./liaison/liaison.module";
import { ManualModule } from "./manual/manual.module";
import { MarketingModule } from "./marketing/marketing.module";
import { NotificationModule } from "./notification/notification.module";
import { OptionsModule } from "./options/options.module";
import { PasskeysModule } from "./passkeys/passkeys.module";
import { PipelineModule } from "./pipeline/pipeline.module";
import { PlacesModule } from "./places/places.module";
import { RegistrationModule } from "./registration/registration.module";
import { SupportModule } from "./support/support.module";
import { TaskModule } from "./task/task.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [
    AuthModule,
    BillingModule,
    PasskeysModule,
    RegistrationModule,
    EmailModule,
    FaxModule,
    ImageModule,
    UserModule,
    BoardModule,
    BookingModule,
    CalendarModule,
    AnalyticsModule,
    OptionsModule,
    LiaisonModule,
    SupportModule,
    ManualModule,
    PlacesModule,
    PipelineModule,
    TaskModule,
    MarketingModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [],
})
export class ApiModule {}
