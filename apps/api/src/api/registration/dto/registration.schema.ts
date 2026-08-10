import { createZodDto } from "nestjs-zod";
import {
  CompleteSignupSchema,
  InvitationContextSchema,
  SendMigrationOtpSchema,
  SendSignupOtpSchema,
  VerifyMigrationOtpSchema,
  VerifySignupOtpSchema,
} from "./registration.dto";

export class SendSignupOtpDto extends createZodDto(SendSignupOtpSchema) {}
export class CompleteSignupDto extends createZodDto(CompleteSignupSchema) {}
export class VerifySignupOtpDto extends createZodDto(VerifySignupOtpSchema) {}
export class InvitationContextDto extends createZodDto(
  InvitationContextSchema
) {}
export class SendMigrationOtpDto extends createZodDto(SendMigrationOtpSchema) {}
export class VerifyMigrationOtpDto extends createZodDto(
  VerifyMigrationOtpSchema
) {}
