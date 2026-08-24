import { Module } from "@nestjs/common";
import { CustomAnalyticsController } from "./custom-analytics.controller";
import { CustomAnalyticsService } from "./custom-analytics.service";

@Module({
  controllers: [CustomAnalyticsController],
  providers: [CustomAnalyticsService],
  exports: [CustomAnalyticsService],
})
export class CustomAnalyticsModule {}
