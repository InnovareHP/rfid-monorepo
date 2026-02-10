import { Module } from "@nestjs/common";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuthModule } from "./auth/auth.module";
import { ImageModule } from "./image/image.module";
import { LeadModule } from "./lead/lead.module";
import { LiasonModule } from "./liason/liason.module";
import { OptionsModule } from "./options/options.module";
import { PlanModule } from "./plan/plan.module";
import { ReferralModule } from "./referral/referral.module";
import { UserModule } from "./user/user.module";
import { BoardModule } from "./board/board.module";

@Module({
  imports: [
    AuthModule,
    ImageModule,
    UserModule,
    PlanModule,
    LeadModule,
    BoardModule,
    ReferralModule,
    AnalyticsModule,
    OptionsModule,
    LiasonModule,
  ],
  controllers: [],
  providers: [],
})
export class ApiModule {}
