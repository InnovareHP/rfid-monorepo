import { createZodDto } from "nestjs-zod";
import {
  CreateModuleSchema,
  ReorderModulesSchema,
  UpdateModuleSchema,
} from "./module.schema";

export class CreateModuleDto extends createZodDto(CreateModuleSchema) {}
export class UpdateModuleDto extends createZodDto(UpdateModuleSchema) {}
export class ReorderModulesDto extends createZodDto(ReorderModulesSchema) {}
