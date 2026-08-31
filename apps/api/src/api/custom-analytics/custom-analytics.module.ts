import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { CustomAnalyticsController } from "./custom-analytics.controller";
import { CustomAnalyticsService } from "./custom-analytics.service";

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.GEMINI })],
  controllers: [CustomAnalyticsController],
  providers: [CustomAnalyticsService],
  exports: [CustomAnalyticsService],
})
export class CustomAnalyticsModule {}
