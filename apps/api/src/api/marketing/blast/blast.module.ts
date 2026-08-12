import { Module } from "@nestjs/common";
import { BoardModule } from "../../board/board.module";
import { GroupModule } from "../group/group.module";
import { SenderModule } from "../sender/sender.module";
import { SubscriberModule } from "../subscriber/subscriber.module";
import { BlastSendProcessor } from "./blast-send.processor";
import { BlastController } from "./blast.controller";
import { BlastService } from "./blast.service";

@Module({
  imports: [BoardModule, GroupModule, SenderModule, SubscriberModule],
  controllers: [BlastController],
  providers: [BlastService, BlastSendProcessor],
})
export class BlastModule {}
