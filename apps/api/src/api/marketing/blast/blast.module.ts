import { Module } from "@nestjs/common";
import { BoardModule } from "../../board/board.module";
import { BlastSendProcessor } from "./blast-send.processor";
import { BlastController } from "./blast.controller";
import { BlastService } from "./blast.service";

@Module({
  imports: [BoardModule],
  controllers: [BlastController],
  providers: [BlastService, BlastSendProcessor],
})
export class BlastModule {}
