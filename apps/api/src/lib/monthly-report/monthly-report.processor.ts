import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../queue/queue.constants";
import { MonthlyReportService } from "./monthly-report.service";

const SCHEDULER_ID = "monthly-performance-report";
const JOB_NAME = "monthly-report";

// 07:10 UTC on the first of the month, off the hour so it does not land with
// everything else that wakes up at midnight.
const CRON = "10 7 1 * *";

@Injectable()
@Processor(QUEUE_NAMES.MONTHLY_REPORT)
export class MonthlyReportProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(MonthlyReportProcessor.name);

  constructor(
    private readonly monthlyReport: MonthlyReportService,
    @InjectQueue(QUEUE_NAMES.MONTHLY_REPORT) private readonly queue: Queue
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
    const outcome = await this.monthlyReport.run();

    this.logger.log(
      `Monthly report run complete: ${outcome.sent} of ${outcome.organizations} organization(s) entitled`
    );

    return outcome;
  }
}
