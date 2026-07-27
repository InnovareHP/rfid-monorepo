import { Module } from "@nestjs/common";
import { EmailIngestController } from "./email-ingest.controller";
import { EmailIngestProcessor } from "./email-ingest.processor";
import { EmailIngestService } from "./email-ingest.service";
import { EmailTrackingController } from "./email-tracking.controller";
import { EmailTrackingService } from "./email-tracking.service";
import { EmailController } from "./email.controller";
import { EmailProcessor } from "./email.processor";
import { EmailService } from "./email.service";

@Module({
  controllers: [
    EmailTrackingController,
    EmailIngestController,
    EmailController,
  ],
  providers: [
    EmailService,
    EmailProcessor,
    EmailTrackingService,
    EmailIngestService,
    EmailIngestProcessor,
  ],
  exports: [EmailService, EmailTrackingService, EmailIngestService],
})
export class EmailModule {}
