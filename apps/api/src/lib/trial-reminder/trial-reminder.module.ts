import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { QUEUE_NAMES } from "../queue/queue.constants";
import { TrialReminderProcessor } from "./trial-reminder.processor";
import { TrialReminderService } from "./trial-reminder.service";

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.TRIAL_REMINDER })],
  providers: [TrialReminderService, TrialReminderProcessor],
})
export class TrialReminderModule {}
