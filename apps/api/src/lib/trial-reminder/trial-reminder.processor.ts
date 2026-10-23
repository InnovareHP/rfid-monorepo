import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../queue/queue.constants";
import { TrialReminderService } from "./trial-reminder.service";

const SCHEDULER_ID = "trial-reminder-sweep";
const JOB_NAME = "trial-reminder";

// Hourly at :20, so a missed run only delays the reminder by an hour.
const CRON = "20 * * * *";

@Injectable()
@Processor(QUEUE_NAMES.TRIAL_REMINDER)
export class TrialReminderProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(TrialReminderProcessor.name);

  constructor(
    private readonly reminders: TrialReminderService,
    @InjectQueue(QUEUE_NAMES.TRIAL_REMINDER) private readonly queue: Queue
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
    const sent = await this.reminders.sweep();
    if (sent > 0) this.logger.log(`Sent ${sent} trial reminder(s)`);
  }
}
