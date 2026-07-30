import { Module } from "@nestjs/common";
import { FaxController } from "./fax.controller";
import { FaxService } from "./fax.service";

@Module({
  controllers: [FaxController],
  providers: [FaxService],
  exports: [FaxService],
})
export class FaxModule {}
