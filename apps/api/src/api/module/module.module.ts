import { Module } from "@nestjs/common";
import { ModuleGroupController } from "./module-group.controller";
import { ModuleGroupService } from "./module-group.service";
import { ModuleController } from "./module.controller";
import { ModuleService } from "./module.service";

@Module({
  controllers: [ModuleGroupController, ModuleController],
  providers: [ModuleService, ModuleGroupService],
  exports: [ModuleService, ModuleGroupService],
})
export class ModulesModule {}
