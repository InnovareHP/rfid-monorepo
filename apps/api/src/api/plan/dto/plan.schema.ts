import { createZodDto } from "nestjs-zod";
import { GetPlanSchema } from "./plan.dto";

export class GetPlanDto extends createZodDto(GetPlanSchema) {}
