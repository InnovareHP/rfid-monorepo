import { Module } from "@nestjs/common";
import { CustomAnalyticsModule } from "../custom-analytics/custom-analytics.module";
import { ModulesModule } from "../module/module.module";
import { NavController } from "./nav.controller";

@Module({
  imports: [ModulesModule, CustomAnalyticsModule],
  controllers: [NavController],
})
export class NavModule {}
