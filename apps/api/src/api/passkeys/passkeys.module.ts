import { Module } from "@nestjs/common";
import { PasskeysController } from "./passkeys.controller";
import { PasskeysService } from "./passkeys.service";

@Module({
  controllers: [PasskeysController],
  providers: [PasskeysService],
})
export class PasskeysModule {}
