import { createZodDto } from "nestjs-zod";
import {
  PurgeOrganizationDataSchema,
  SignBaaSchema,
  UpdateComplianceSettingsSchema,
} from "./compliance.dto";

export class UpdateComplianceSettingsDto extends createZodDto(
  UpdateComplianceSettingsSchema
) {}
export class SignBaaDto extends createZodDto(SignBaaSchema) {}
export class PurgeOrganizationDataDto extends createZodDto(
  PurgeOrganizationDataSchema
) {}
