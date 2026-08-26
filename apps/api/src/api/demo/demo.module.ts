import { Module } from "@nestjs/common";
import { BookingModule } from "../booking/booking.module";
import { DemoPublicController } from "./demo-public.controller";
import { DemoController } from "./demo.controller";
import { DemoService } from "./demo.service";

@Module({
  imports: [BookingModule],
  controllers: [DemoController, DemoPublicController],
  providers: [DemoService],
})
export class DemoModule {}
