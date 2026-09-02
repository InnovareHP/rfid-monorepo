-- Invitee-local confirmation times and the upcoming-meeting reminder.
-- Additive only, safe to apply on a live database.

ALTER TABLE booking_schema."Booking"
  ADD COLUMN IF NOT EXISTS "inviteeTimezone" TEXT;
ALTER TABLE booking_schema."Booking"
  ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMPTZ(3);

-- The reminder sweep selects unsent CONFIRMED rows inside a time window, so it
-- reads on startTime with reminderSentAt still null.
CREATE INDEX IF NOT EXISTS "Booking_reminder_due_idx"
  ON booking_schema."Booking" ("startTime")
  WHERE "reminderSentAt" IS NULL AND "status" = 'CONFIRMED';
