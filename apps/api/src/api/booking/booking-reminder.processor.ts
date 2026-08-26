import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../../lib/queue/queue.constants";
import { BookingReminderService } from "./booking-reminder.service";

const SCHEDULER_ID = "booking-reminder-sweep";
const JOB_NAME = "booking-reminder";

// Every fifteen minutes. The sweep is idempotent through reminderSentAt, so a
// missed run only delays a reminder rather than dropping it.
const CRON = "*/15 * * * *";

@Injectable()
@Processor(QUEUE_NAMES.BOOKING_REMINDER)
export class BookingReminderProcessor
  extends WorkerHost
  implements OnModuleInit
{
  private readonly logger = new Logger(BookingReminderProcessor.name);

  constructor(
    private readonly reminders: BookingReminderService,
    @InjectQueue(QUEUE_NAMES.BOOKING_REMINDER) private readonly queue: Queue
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
    if (sent > 0) this.logger.log(`Sent ${sent} booking reminder(s)`);
  }
}
