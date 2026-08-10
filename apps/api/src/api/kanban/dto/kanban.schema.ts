import { createZodDto } from "nestjs-zod";
import { UpdateKanbanStagesSchema } from "./kanban.dto";

export class UpdateKanbanStagesDto extends createZodDto(
  UpdateKanbanStagesSchema
) {}
