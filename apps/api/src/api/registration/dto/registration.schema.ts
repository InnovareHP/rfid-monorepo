import { createZodDto } from "nestjs-zod";
import {
  InvitationContextSchema,
  SendMigrationOtpSchema,
  SendSignupOtpSchema,
  VerifyMigrationOtpSchema,
  VerifySignupOtpSchema,
} from "./registration.dto";

export class SendSignupOtpDto extends createZodDto(SendSignupOtpSchema) {}
export class VerifySignupOtpDto extends createZodDto(VerifySignupOtpSchema) {}
export class InvitationContextDto extends createZodDto(
  InvitationContextSchema
) {}
export class SendMigrationOtpDto extends createZodDto(SendMigrationOtpSchema) {}
export class VerifyMigrationOtpDto extends createZodDto(
  VerifyMigrationOtpSchema
) {}
