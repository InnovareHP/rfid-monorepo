import { Module } from "@nestjs/common";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AssistantModule } from "./assistant/assistant.module";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { BoardExportModule } from "./board/board-export.module";
import { BoardModule } from "./board/board.module";
import { BookingModule } from "./booking/booking.module";
import { CalendarModule } from "./calendar/calendar.module";
import { ComplianceModule } from "./compliance/compliance.module";
import { CustomAnalyticsModule } from "./custom-analytics/custom-analytics.module";
import { EmailModule } from "./email/email.module";
import { FaxModule } from "./fax/fax.module";
import { HealthModule } from "./health/health.module";
import { ImageModule } from "./image/image.module";
import { LiaisonModule } from "./liaison/liaison.module";
import { ManualModule } from "./manual/manual.module";
import { MarketingModule } from "./marketing/marketing.module";
import { ModulesModule } from "./module/module.module";
import { ReportModule } from "./report/report.module";
import { NotificationModule } from "./notification/notification.module";
import { OptionsModule } from "./options/options.module";
import { PasskeysModule } from "./passkeys/passkeys.module";
import { KanbanModule } from "./kanban/kanban.module";
import { PlacesModule } from "./places/places.module";
import { RegistrationModule } from "./registration/registration.module";
import { SupportModule } from "./support/support.module";
import { TaskModule } from "./task/task.module";
import { TeamModule } from "./team/team.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [
    AuthModule,
    BillingModule,
    ComplianceModule,
    PasskeysModule,
    RegistrationModule,
    EmailModule,
    FaxModule,
    ImageModule,
    UserModule,
    // Must precede BoardModule: routes register in import order, and
    // BoardController's "boards/:recordId" would otherwise swallow
    // "boards/export" and look up a record named "export".
    BoardExportModule,
    BoardModule,
    BookingModule,
    CalendarModule,
    AnalyticsModule,
    OptionsModule,
    LiaisonModule,
    SupportModule,
    ManualModule,
    AssistantModule,
    PlacesModule,
    KanbanModule,
    TaskModule,
    TeamModule,
    MarketingModule,
    ModulesModule,
    ReportModule,
    CustomAnalyticsModule,
    NotificationModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class ApiModule {}
