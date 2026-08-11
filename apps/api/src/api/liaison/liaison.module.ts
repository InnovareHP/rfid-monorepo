import { Module } from "@nestjs/common";
import { LiaisonActivityService } from "./liaison-activity.service";
import { LiaisonController } from "./liaison.controller";
import { LiaisonService } from "./liaison.service";

@Module({
  controllers: [LiaisonController],
  providers: [LiaisonService, LiaisonActivityService],
  exports: [LiaisonActivityService],
})
export class LiaisonModule {}
