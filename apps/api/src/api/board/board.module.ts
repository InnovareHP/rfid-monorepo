import { Module } from "@nestjs/common";
import { EmailModule } from "../email/email.module";
import { FaxModule } from "../fax/fax.module";
import { ImageModule } from "../image/image.module";
import { LiaisonModule } from "../liaison/liaison.module";
import { BoardNotifyModule } from "./board-notify.module";
import { BoardOAuthCallbackController } from "./board-oauth-callback.controller";
import { BoardController } from "./board.controller";
import { BoardGateway } from "./board.gateway";
import { BoardService } from "./board.service";
import { BulkEmailProcessor } from "./bulk-email.processor";
import { CsvImportProcessor } from "./csv-import.processor";
import { EmailDispatchService } from "./email-dispatch.service";
import { GmailService } from "./gmail.service";
import { OutlookService } from "./outlook.service";

@Module({
  imports: [
    FaxModule,
    EmailModule,
    BoardNotifyModule,
    LiaisonModule,
    ImageModule,
  ],
  controllers: [BoardOAuthCallbackController, BoardController],
  providers: [
    BoardService,
    BoardGateway,
    GmailService,
    OutlookService,
    EmailDispatchService,
    BulkEmailProcessor,
    CsvImportProcessor,
  ],
  exports: [BoardService, BoardGateway, EmailDispatchService],
})
export class BoardModule {}
