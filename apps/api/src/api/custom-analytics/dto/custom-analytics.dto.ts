import { createZodDto } from "nestjs-zod";
import {
  PreviewCustomAnalyticSchema,
  RunCustomAnalyticQuerySchema,
  RunDashboardQuerySchema,
  SaveCustomAnalyticSchema,
  UpdateCustomAnalyticSchema,
} from "./custom-analytics.schema";

export class PreviewCustomAnalyticDto extends createZodDto(
  PreviewCustomAnalyticSchema
) {}
export class SaveCustomAnalyticDto extends createZodDto(
  SaveCustomAnalyticSchema
) {}
export class UpdateCustomAnalyticDto extends createZodDto(
  UpdateCustomAnalyticSchema
) {}
export class RunCustomAnalyticQueryDto extends createZodDto(
  RunCustomAnalyticQuerySchema
) {}
export class RunDashboardQueryDto extends createZodDto(
  RunDashboardQuerySchema
) {}
