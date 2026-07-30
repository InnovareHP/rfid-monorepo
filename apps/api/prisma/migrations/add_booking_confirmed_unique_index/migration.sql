-- A cancelled booking must not permanently block rebooking the same slot.
-- Replace the plain unique index on (bookingPageId, startTime) with a partial
-- unique index scoped to CONFIRMED rows only; the app still re-checks for
-- overlap inside the write transaction to catch the same race.

DROP INDEX IF EXISTS booking_schema."Booking_bookingPageId_startTime_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingPageId_startTime_confirmed_key"
  ON booking_schema."Booking" ("bookingPageId", "startTime")
  WHERE "status" = 'CONFIRMED';
