import { createZodDto } from "nestjs-zod";
import {
  CreateGroupSchema,
  PreviewGroupSchema,
  UpdateGroupSchema,
} from "./group.schema";

export class CreateGroupDto extends createZodDto(CreateGroupSchema) {}
export class UpdateGroupDto extends createZodDto(UpdateGroupSchema) {}
export class PreviewGroupDto extends createZodDto(PreviewGroupSchema) {}
