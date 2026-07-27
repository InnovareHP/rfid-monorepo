import { createZodDto } from "nestjs-zod";
import {
  SetPipelineConfigSchema,
  UpdatePipelineStagesSchema,
} from "./pipeline.dto";

export class SetPipelineConfigDto extends createZodDto(
  SetPipelineConfigSchema
) {}
export class UpdatePipelineStagesDto extends createZodDto(
  UpdatePipelineStagesSchema
) {}
