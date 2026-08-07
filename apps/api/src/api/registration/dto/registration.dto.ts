import { z } from "zod";

export const SendSignupOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const VerifySignupOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(80),
  code: z.string().trim().length(6),
});

export const InvitationContextSchema = z.object({
  invitationId: z.string().trim().min(1),
});

export const SendMigrationOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const VerifyMigrationOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().length(6),
});
