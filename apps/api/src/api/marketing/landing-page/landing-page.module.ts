import { Module } from "@nestjs/common";
import { FormModule } from "../form/form.module";
import { LandingPagePublicController } from "./landing-page-public.controller";
import { LandingPageController } from "./landing-page.controller";
import { LandingPageService } from "./landing-page.service";

@Module({
  imports: [FormModule],
  controllers: [LandingPageController, LandingPagePublicController],
  providers: [LandingPageService],
})
export class LandingPageModule {}
