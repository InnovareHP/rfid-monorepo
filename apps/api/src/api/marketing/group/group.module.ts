import { Module } from "@nestjs/common";
import { SubscriberModule } from "../subscriber/subscriber.module";
import { GroupController } from "./group.controller";
import { GroupService } from "./group.service";

@Module({
  imports: [SubscriberModule],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
