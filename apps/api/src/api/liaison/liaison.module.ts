import { Module } from "@nestjs/common";
import { LiaisonController } from "./liaison.controller";
import { LiaisonService } from "./liaison.service";

@Module({
  controllers: [LiaisonController],
  providers: [LiaisonService],
})
export class LiaisonModule {}
