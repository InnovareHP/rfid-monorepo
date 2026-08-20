import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { QUEUE_NAMES } from "../queue/queue.constants";
import { AuditRetentionProcessor } from "./audit-retention.processor";
import { AuditRetentionService } from "./audit-retention.service";
import { AuditInterceptor } from "./audit.interceptor";
import { AuditService } from "./audit.service";

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.RETENTION })],
  providers: [
    AuditService,
    AuditRetentionService,
    AuditRetentionProcessor,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService, AuditRetentionService],
})
export class AuditModule {}
