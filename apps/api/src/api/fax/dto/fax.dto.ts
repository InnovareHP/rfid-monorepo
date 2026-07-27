import { z } from "zod";

const e164 = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Recipient must be E.164, e.g. +15551234567");

export const SendFaxSchema = z.object({
  to: z.union([e164, z.array(e164).min(1)]),
});

export const ListFaxesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const ConnectFaxIntegrationSchema = z.object({
  apiKey: z.string().min(10, "API key is required"),
});
