import { createZodDto } from "nestjs-zod";
import {
  BulkEmailSchema,
  CompleteActivitySchema,
  CreateActivitySchema,
  CreateColumnSchema,
  CreateFieldOptionSchema,
  CreateHistorySchema,
  CreateLocationSchema,
  CreateRecordCountyAssignmentSchema,
  CreateRecordSchema,
  CsvImportSchema,
  DeleteRecordsSchema,
  NotificationStateSchema,
  RestoreHistorySchema,
  UpdateActivitySchema,
  UpdateRecordValueSchema,
} from "./board.dto";

export class CreateRecordDto extends createZodDto(CreateRecordSchema) {}
export class UpdateRecordValueDto extends createZodDto(
  UpdateRecordValueSchema
) {}
export class RestoreHistoryDto extends createZodDto(RestoreHistorySchema) {}
export class NotificationStateDto extends createZodDto(
  NotificationStateSchema
) {}
export class CsvImportDto extends createZodDto(CsvImportSchema) {}
export class CreateColumnDto extends createZodDto(CreateColumnSchema) {}
export class CreateLocationDto extends createZodDto(CreateLocationSchema) {}
export class CreateFieldOptionDto extends createZodDto(
  CreateFieldOptionSchema
) {}
export class CreateHistoryDto extends createZodDto(CreateHistorySchema) {}
export class DeleteRecordsDto extends createZodDto(DeleteRecordsSchema) {}
export class CreateRecordCountyAssignmentDto extends createZodDto(
  CreateRecordCountyAssignmentSchema
) {}
export class CreateActivityDto extends createZodDto(CreateActivitySchema) {}
export class UpdateActivityDto extends createZodDto(UpdateActivitySchema) {}
export class CompleteActivityDto extends createZodDto(
  CompleteActivitySchema
) {}
export class BulkEmailDto extends createZodDto(BulkEmailSchema) {}
