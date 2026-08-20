import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUE_NAMES } from "../queue/queue.constants";
import { MonthlyReportProcessor } from "./monthly-report.processor";
import { MonthlyReportService } from "./monthly-report.service";

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.MONTHLY_REPORT })],
  providers: [MonthlyReportService, MonthlyReportProcessor],
  exports: [MonthlyReportService],
})
export class MonthlyReportModule {}
