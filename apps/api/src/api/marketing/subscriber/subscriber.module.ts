import { Module } from "@nestjs/common";
import { SubscriberPublicController } from "./subscriber-public.controller";
import { SubscriberController } from "./subscriber.controller";
import { SubscriberService } from "./subscriber.service";

@Module({
  controllers: [SubscriberController, SubscriberPublicController],
  providers: [SubscriberService],
  exports: [SubscriberService],
})
export class SubscriberModule {}
