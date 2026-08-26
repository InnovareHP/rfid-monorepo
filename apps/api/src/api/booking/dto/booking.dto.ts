import { z } from "zod";

export const UpdateBookingPageSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  locationType: z.enum(["VIDEO", "IN_PERSON", "BOTH"]).optional(),
  locationLabel: z.string().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  timezone: z.string().min(1).optional(),
  bufferBeforeMinutes: z.number().int().min(0).max(120).optional(),
  bufferAfterMinutes: z.number().int().min(0).max(120).optional(),
  minNoticeHours: z.number().int().min(0).max(168).optional(),
  isActive: z.boolean().optional(),
  // Null clears the preference back to whichever calendar is connected.
  preferredProvider: z.enum(["GOOGLE", "OUTLOOK"]).nullable().optional(),
});

export const AvailabilityRuleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startMinute: z.number().int().min(0).max(1440),
  endMinute: z.number().int().min(0).max(1440),
});

export const ReplaceAvailabilitySchema = z.object({
  rules: z.array(AvailabilityRuleSchema),
});

export const CreateBookingSchema = z.object({
  startTime: z.iso.datetime(),
  inviteeName: z.string().min(1),
  inviteeEmail: z.email(),
  inviteeNotes: z.string().optional(),
  locationType: z.enum(["VIDEO", "IN_PERSON"]).optional(),
  boardId: z.string().optional(),
  // IANA zone from the browser. Optional so a direct API caller still works;
  // absent falls back to the host's zone.
  inviteeTimezone: z.string().max(64).optional(),
});

export const ReschedulePublicBookingSchema = z.object({
  startTime: z.iso.datetime(),
});
