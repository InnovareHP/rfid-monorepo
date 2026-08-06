import { createZodDto } from "nestjs-zod";
import {
  SignBaaSchema,
  UpdateComplianceSettingsSchema,
} from "./compliance.dto";

export class UpdateComplianceSettingsDto extends createZodDto(
  UpdateComplianceSettingsSchema
) {}
export class SignBaaDto extends createZodDto(SignBaaSchema) {}
