import { z } from "zod";

export const CreateSubscriberSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
});

export const ListSubscribersSchema = z.object({
  status: z.enum(["SUBSCRIBED", "UNSUBSCRIBED"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const PublicSubscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
});
