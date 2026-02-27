import { Module } from "@nestjs/common";
import { BoardOAuthCallbackController } from "./board-oauth-callback.controller";
import { BoardController } from "./board.controller";
import { BoardGateway } from "./board.gateway";
import { BoardService } from "./board.service";
import { BulkEmailProcessor } from "./bulk-email.processor";
import { CsvImportProcessor } from "./csv-import.processor";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

@Module({
  controllers: [BoardOAuthCallbackController, BoardController],
  providers: [
    BoardService,
    BoardGateway,
    GmailService,
    OutlookService,
    BulkEmailProcessor,
    CsvImportProcessor,
  ],
})
export class BoardModule {}
