import { createZodDto } from "nestjs-zod";
import {
  BulkDeleteLogSchema,
  CreateExpenseSchema,
  CreateMarketingSchema,
  CreateMillageSchema,
  ImportAccountManagersSchema,
  ImportMarketingSchema,
  UndoMarketingImportSchema,
  UpdateExpenseSchema,
  UpdateMarketingSchema,
  UpdateMillageSchema,
} from "./liaison.dto";

export class CreateMillageDto extends createZodDto(CreateMillageSchema) {}
export class UpdateMillageDto extends createZodDto(UpdateMillageSchema) {}

export class CreateMarketingDto extends createZodDto(CreateMarketingSchema) {}
export class UpdateMarketingDto extends createZodDto(UpdateMarketingSchema) {}

export class CreateExpenseDto extends createZodDto(CreateExpenseSchema) {}
export class UpdateExpenseDto extends createZodDto(UpdateExpenseSchema) {}

export class BulkDeleteLogDto extends createZodDto(BulkDeleteLogSchema) {}

export class ImportMarketingDto extends createZodDto(ImportMarketingSchema) {}
export class ImportAccountManagersDto extends createZodDto(
  ImportAccountManagersSchema
) {}
export class UndoMarketingImportDto extends createZodDto(
  UndoMarketingImportSchema
) {}
