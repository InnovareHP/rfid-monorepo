import { Module } from "@nestjs/common";
import { BillingHistoryService } from "./billing-history.service";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";

@Module({
  controllers: [BillingController],
  providers: [BillingService, BillingHistoryService],
})
export class BillingModule {}
