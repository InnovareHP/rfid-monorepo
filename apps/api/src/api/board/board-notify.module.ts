import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
import { BoardNotifyService } from "./board-notify.service";

// Split from BoardModule so the email module can raise record notices without
// importing BoardModule, which already imports EmailModule.
@Module({
  imports: [NotificationModule],
  providers: [BoardNotifyService],
  exports: [BoardNotifyService],
})
export class BoardNotifyModule {}
