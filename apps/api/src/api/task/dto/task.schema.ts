import { createZodDto } from "nestjs-zod";
import {
  CreateAttachmentSchema,
  CreateChecklistItemSchema,
  CreateCommentSchema,
  CreateDependencySchema,
  CreateLabelSchema,
  CreateListSchema,
  CreateProjectSchema,
  CreateTaskSchema,
  CreateTimeEntrySchema,
  ReorderTaskSchema,
  SetLabelsSchema,
  SetMembersSchema,
  StartTimerSchema,
  UpdateChecklistItemSchema,
  UpdateCommentSchema,
  UpdateLabelSchema,
  UpdateListSchema,
  UpdateProjectSchema,
  UpdateTaskSchema,
} from "./task.dto";

export class CreateProjectDto extends createZodDto(CreateProjectSchema) {}
export class UpdateProjectDto extends createZodDto(UpdateProjectSchema) {}

export class CreateListDto extends createZodDto(CreateListSchema) {}
export class UpdateListDto extends createZodDto(UpdateListSchema) {}

export class CreateLabelDto extends createZodDto(CreateLabelSchema) {}
export class UpdateLabelDto extends createZodDto(UpdateLabelSchema) {}

export class CreateTaskDto extends createZodDto(CreateTaskSchema) {}
export class UpdateTaskDto extends createZodDto(UpdateTaskSchema) {}

export class ReorderTaskDto extends createZodDto(ReorderTaskSchema) {}
export class SetMembersDto extends createZodDto(SetMembersSchema) {}
export class SetLabelsDto extends createZodDto(SetLabelsSchema) {}

export class CreateChecklistItemDto extends createZodDto(
  CreateChecklistItemSchema
) {}
export class UpdateChecklistItemDto extends createZodDto(
  UpdateChecklistItemSchema
) {}

export class CreateCommentDto extends createZodDto(CreateCommentSchema) {}
export class UpdateCommentDto extends createZodDto(UpdateCommentSchema) {}

export class CreateAttachmentDto extends createZodDto(CreateAttachmentSchema) {}
export class CreateTimeEntryDto extends createZodDto(CreateTimeEntrySchema) {}
export class StartTimerDto extends createZodDto(StartTimerSchema) {}
export class CreateDependencyDto extends createZodDto(CreateDependencySchema) {}
