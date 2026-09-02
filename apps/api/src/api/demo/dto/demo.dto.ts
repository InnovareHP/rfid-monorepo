import {
  DEMO_OUTCOME_STATUSES,
  DEMO_REQUEST_STATUSES,
} from "@dashboard/shared";
import { z } from "zod";

// The honeypot is a field no human fills. Non-empty means a bot, and the route
// answers 200 so the bot learns nothing from being refused.
export const CreateDemoRequestSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.email().max(254),
  company: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  teamSize: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  source: z.string().max(80).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  website: z.string().max(200).optional(),
});

export const BookDemoSchema = z.object({
  startTime: z.iso.datetime(),
  // The prospect's own zone, so their confirmation reads in local time.
  inviteeTimezone: z.string().max(64).optional(),
});

export const ListDemoRequestsQuerySchema = z.object({
  status: z.enum(DEMO_REQUEST_STATUSES).optional(),
  search: z.string().max(160).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
});

// Only outcomes are settable by hand; NEW and SCHEDULED are written by the flow.
export const UpdateDemoRequestSchema = z
  .object({
    status: z.enum(DEMO_OUTCOME_STATUSES).optional(),
    outcomeNotes: z.string().max(4000).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update",
  });

export const SetDemoHostSchema = z.object({
  userId: z.string().min(1),
  demoEnabled: z.boolean(),
});
