import { Module } from "@nestjs/common";
import { BlastModule } from "./blast/blast.module";
import { CampaignModule } from "./campaign/campaign.module";
import { FormModule } from "./form/form.module";
import { LandingPageModule } from "./landing-page/landing-page.module";

@Module({
  imports: [FormModule, CampaignModule, BlastModule, LandingPageModule],
})
export class MarketingModule {}
