import { createZodDto } from "nestjs-zod";
import {
  CreateExpenseSchema,
  CreateMarketingSchema,
  CreateMillageSchema,
  UpdateExpenseSchema,
  UpdateMarketingSchema,
  UpdateMillageSchema,
} from "./liason.dto";

export class CreateMillageDto extends createZodDto(CreateMillageSchema) {}
export class UpdateMillageDto extends createZodDto(UpdateMillageSchema) {}

export class CreateMarketingDto extends createZodDto(CreateMarketingSchema) {}
export class UpdateMarketingDto extends createZodDto(UpdateMarketingSchema) {}

export class CreateExpenseDto extends createZodDto(CreateExpenseSchema) {}
export class UpdateExpenseDto extends createZodDto(UpdateExpenseSchema) {}
