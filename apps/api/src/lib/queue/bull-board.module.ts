import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { BullBoardModule } from "@bull-board/nestjs";
import { Module } from "@nestjs/common";
import { QUEUE_NAMES } from "./queue.constants";

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: "/api/queues",
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.EMAIL,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.BULK_EMAIL,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.CSV_IMPORT,
      adapter: BullMQAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.GEMINI,
      adapter: BullMQAdapter,
    }),
  ],
})
export class BullBoardSetupModule {}
