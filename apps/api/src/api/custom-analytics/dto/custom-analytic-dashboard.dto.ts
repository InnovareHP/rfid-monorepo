import { createZodDto } from "nestjs-zod";
import {
  ReorderDashboardChartsSchema,
  SaveDashboardSchema,
  UpdateDashboardSchema,
} from "./custom-analytic-dashboard.schema";

export class SaveDashboardDto extends createZodDto(SaveDashboardSchema) {}
export class UpdateDashboardDto extends createZodDto(UpdateDashboardSchema) {}
export class ReorderDashboardChartsDto extends createZodDto(
  ReorderDashboardChartsSchema
) {}
