import { Queue } from "bullmq";
import { appConfig } from "../../config/app-config";
import { QUEUE_NAMES } from "./queue.constants";

// Standalone queue instance for use outside NestJS DI (e.g., auth.ts hooks)
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  connection: { url: appConfig.REDIS_URL },
});
