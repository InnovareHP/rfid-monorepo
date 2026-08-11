import { Module } from "@nestjs/common";
import { BoardExportController } from "./board-export.controller";
import { BoardExportService } from "./board-export.service";
import { BoardModule } from "./board.module";

// Its own module so the export path can be added without touching BoardModule.
@Module({
  imports: [BoardModule],
  controllers: [BoardExportController],
  providers: [BoardExportService],
})
export class BoardExportModule {}
