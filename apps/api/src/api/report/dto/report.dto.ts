import { createZodDto } from "nestjs-zod";
import { SaveReportSchema, UpdateReportSchema } from "./report.schema";

export class SaveReportDto extends createZodDto(SaveReportSchema) {}
export class UpdateReportDto extends createZodDto(UpdateReportSchema) {}
