import { MAX_SEATS } from "@dashboard/shared";
import { z } from "zod";

export const TRANSACTION_TYPES = [
  "SUBSCRIPTION",
  "SEAT_CHANGE",
  "REFUND",
  "OTHER",
] as const;

// Query values arrive as strings, so coerce before the range check rather than
// rejecting a valid page as a type error.
export const ListTransactionsQuerySchema = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const ListInvoicesQuerySchema = z.object({
  startingAfter: z.string().min(1).optional(),
});

// The lower bound against current head count is a data check, so it lives in the
// service; this only bounds the number itself.
export const UpdateSeatsSchema = z.object({
  seats: z.number().int().min(1).max(MAX_SEATS),
});
