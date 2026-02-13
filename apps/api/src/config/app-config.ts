// src/config/app.config.ts
import "dotenv/config";
import { z } from "zod";

export const appConfigSchema = z.object({
  DATABASE_URL: z.url(),
  APP_NAME: z.string().default("auth-service"),
  APP_EMAIL: z.string(),
  REDIS_URL: z.string().url(),
  RESEND_API_KEY: z.string().min(1),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_SERVICE: z.string().default("auth"),

  DEBUG: z.coerce.boolean().default(false),
  WEBSITE_URL: z.url(),
  SUPPORT_URL: z.url(),
  API_URL: z.url(),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.url(),
  GEOCODIFY_API_KEY: z.string().min(1),

  PORT: z.coerce.number().default(8080),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export const appConfig: AppConfig = appConfigSchema.parse(process.env);
