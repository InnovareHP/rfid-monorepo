import { Module } from "@nestjs/common";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuthModule } from "./auth/auth.module";
import { BoardModule } from "./board/board.module";
import { ImageModule } from "./image/image.module";
import { LiasonModule } from "./liason/liason.module";
import { OptionsModule } from "./options/options.module";
import { PlanModule } from "./plan/plan.module";
import { SupportModule } from "./support/support.module";
import { UserModule } from "./user/user.module";

@Module({
  imports: [
    AuthModule,
    ImageModule,
    UserModule,
    PlanModule,
    BoardModule,
    AnalyticsModule,
    OptionsModule,
    LiasonModule,
    SupportModule,
  ],
  controllers: [],
  providers: [],
})
export class ApiModule {}
