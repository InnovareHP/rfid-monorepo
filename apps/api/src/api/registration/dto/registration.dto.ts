import { z } from "zod";

export const SendSignupOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const VerifySignupOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(80),
  code: z.string().trim().length(6),
});

// Carries the claim from the verify step, not the code or the email: both were
// settled there. The length floor mirrors emailAndPassword.minPasswordLength in
// the auth config, since a shorter password would insert and then be refused at
// sign-in.
export const CompleteSignupSchema = z.object({
  context: z.string().trim().min(1),
  password: z.string().min(12).max(128),
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
