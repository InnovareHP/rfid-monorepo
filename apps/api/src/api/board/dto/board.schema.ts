import { createZodDto } from "nestjs-zod";
import {
  CreateColumnSchema,
  CreateFieldOptionSchema,
  CreateHistorySchema,
  CreateLocationSchema,
  CreateRecordSchema,
  CsvImportSchema,
  DeleteRecordsSchema,
  NotificationStateSchema,
  RestoreHistorySchema,
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
