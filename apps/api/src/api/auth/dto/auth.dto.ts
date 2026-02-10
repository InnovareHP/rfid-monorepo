// user.schema.ts
import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.email(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(20, "Password must be at most 20 characters")
    .regex(
      /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/,
      "Password must contain letters, numbers, and symbols"
    ),
  name: z.string().min(1),
});

export const SignInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  callbackURL: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export const SignOutSchema = z.object({
  sessionId: z.string(),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export const VerifyEmailSchema = z.object({
  email: z.email(),
  token: z.string(),
});

export const RequestPasswordResetSchema = z.object({
  email: z.email(),
});

export const ResetPasswordSchema = z.object({
  email: z.string(),
});

export const GenerateMagicLinkSchema = z.object({
  email: z.email(),
});

export const SendVerificationEmailSchema = z.object({
  email: z.email(),
});

export const GetUserSchema = z.object({
  userId: z.string(),
});
