import { createZodDto } from "nestjs-zod";
import { CreateModuleSchema } from "./module.schema";

export class CreateModuleDto extends createZodDto(CreateModuleSchema) {}
