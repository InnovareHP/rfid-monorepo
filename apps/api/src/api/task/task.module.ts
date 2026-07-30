import { Module } from "@nestjs/common";
import { NotificationModule } from "../notification/notification.module";
import { TaskController } from "./task.controller";
import { TaskService } from "./task.service";

@Module({
  imports: [NotificationModule],
  controllers: [TaskController],
  providers: [TaskService],
})
export class TaskModule {}
