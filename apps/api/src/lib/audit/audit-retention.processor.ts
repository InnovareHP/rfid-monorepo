import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../queue/queue.constants";
import { AuditRetentionService } from "./audit-retention.service";

const SCHEDULER_ID = "audit-retention-daily";
const JOB_NAME = "audit-retention";

// 03:20 UTC, off the top of the hour so it does not land with everything else.
const CRON = "20 3 * * *";

@Injectable()
@Processor(QUEUE_NAMES.RETENTION)
export class AuditRetentionProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(AuditRetentionProcessor.name);

  constructor(
    private readonly retention: AuditRetentionService,
    @InjectQueue(QUEUE_NAMES.RETENTION) private readonly queue: Queue
  ) {
    super();
  }

  // Upsert rather than add: the scheduler is keyed by id, so every boot and
  // every replica converges on one schedule instead of stacking duplicates.
  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      SCHEDULER_ID,
      { pattern: CRON },
      { name: JOB_NAME }
    );
  }

  async process() {
    const outcomes = await this.retention.run();

    for (const outcome of outcomes) {
      if (!outcome.exhausted && outcome.eligible > 0) {
        this.logger.warn(
          `Retention run did not clear the ${outcome.table} backlog: ${outcome.deleted} of ${outcome.eligible} removed. The next run continues.`
        );
      }
    }

    return outcomes;
  }
}
