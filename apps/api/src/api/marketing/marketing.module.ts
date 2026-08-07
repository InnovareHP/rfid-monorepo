import { Module } from "@nestjs/common";
import { BlastModule } from "./blast/blast.module";
import { CampaignModule } from "./campaign/campaign.module";
import { FormModule } from "./form/form.module";
import { GroupModule } from "./group/group.module";
import { LandingPageModule } from "./landing-page/landing-page.module";
import { SenderModule } from "./sender/sender.module";

@Module({
  imports: [
    FormModule,
    CampaignModule,
    BlastModule,
    GroupModule,
    SenderModule,
    LandingPageModule,
  ],
})
export class MarketingModule {}
