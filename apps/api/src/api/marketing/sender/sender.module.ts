import { Module } from "@nestjs/common";
import { BoardModule } from "../../board/board.module";
import { SenderController } from "./sender.controller";
import { SenderService } from "./sender.service";

@Module({
  imports: [BoardModule],
  controllers: [SenderController],
  providers: [SenderService],
  exports: [SenderService],
})
export class SenderModule {}
