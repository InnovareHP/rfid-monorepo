import { Queue } from "bullmq";
import { appConfig } from "../../config/app-config";
import { QUEUE_NAMES } from "./queue.constants";

// Standalone queue instance for use outside NestJS DI (e.g., auth.ts hooks).
// Job options mirror BullModule.forRoot defaults in queue.module.ts.
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: { url: appConfig.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});
