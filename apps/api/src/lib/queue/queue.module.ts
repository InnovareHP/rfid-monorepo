import { BullModule } from "@nestjs/bullmq";
import { Global, Module } from "@nestjs/common";
import { appConfig } from "../../config/app-config";
import { GeminiProcessor } from "./gemini.processor";
import { QUEUE_NAMES } from "./queue.constants";

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: appConfig.REDIS_URL,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.EMAIL },
      { name: QUEUE_NAMES.BULK_EMAIL },
      { name: QUEUE_NAMES.CSV_IMPORT },
      { name: QUEUE_NAMES.GEMINI }
    ),
  ],
  providers: [GeminiProcessor],
  exports: [GeminiProcessor, BullModule],
})
export class QueueModule {}
