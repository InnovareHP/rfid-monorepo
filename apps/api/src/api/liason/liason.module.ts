import { Module } from "@nestjs/common";
import { LiasonController } from "./liason.controller";
import { LiasonService } from "./liason.service";

@Module({
  controllers: [LiasonController],
  providers: [LiasonService],
})
export class LiasonModule {}
