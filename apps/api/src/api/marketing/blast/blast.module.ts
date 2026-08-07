import { Module } from "@nestjs/common";
import { BoardModule } from "../../board/board.module";
import { GroupModule } from "../group/group.module";
import { BlastSendProcessor } from "./blast-send.processor";
import { BlastController } from "./blast.controller";
import { BlastService } from "./blast.service";

@Module({
  imports: [BoardModule, GroupModule],
  controllers: [BlastController],
  providers: [BlastService, BlastSendProcessor],
})
export class BlastModule {}
