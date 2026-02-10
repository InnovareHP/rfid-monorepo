// user.dto.ts
import { createZodDto } from "nestjs-zod";
import {
  CreateUserSchema,
  GenerateMagicLinkSchema,
  GetUserSchema,
  RefreshTokenSchema,
  RequestPasswordResetSchema,
  SendVerificationEmailSchema,
  SignInSchema,
  SignOutSchema,
  VerifyEmailSchema,
} from "./auth.dto";

export class CreateUserDto extends createZodDto(CreateUserSchema) {}

export class SignInDto extends createZodDto(SignInSchema) {}

export class SignOutDto extends createZodDto(SignOutSchema) {}

export class RefreshTokenDto extends createZodDto(RefreshTokenSchema) {}

export class VerifyEmailDto extends createZodDto(VerifyEmailSchema) {}

export class RequestPasswordResetDto extends createZodDto(
  RequestPasswordResetSchema
) {}

export class SendVerificationEmailDto extends createZodDto(
  SendVerificationEmailSchema
) {}

export class GenerateMagicLinkDto extends createZodDto(
  GenerateMagicLinkSchema
) {}

export class GetUserDto extends createZodDto(GetUserSchema) {}
