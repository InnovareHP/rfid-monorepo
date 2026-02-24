import { Module } from "@nestjs/common";
import { BoardController } from "./board.controller";
import { BoardGateway } from "./board.gateway";
import { BoardService } from "./board.service";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

@Module({
  controllers: [BoardController],
  providers: [BoardService, BoardGateway, GmailService, OutlookService],
})
export class BoardModule {}
