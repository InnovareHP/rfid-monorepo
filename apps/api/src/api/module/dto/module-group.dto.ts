import { createZodDto } from "nestjs-zod";
import {
  CreateModuleGroupSchema,
  ReorderModuleGroupsSchema,
  UpdateModuleGroupSchema,
} from "./module-group.schema";

export class CreateModuleGroupDto extends createZodDto(
  CreateModuleGroupSchema
) {}
export class UpdateModuleGroupDto extends createZodDto(
  UpdateModuleGroupSchema
) {}
export class ReorderModuleGroupsDto extends createZodDto(
  ReorderModuleGroupsSchema
) {}
