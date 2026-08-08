-- Which calendar a booking page writes to when the host connected both.
CREATE TYPE "booking_schema"."CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK');

ALTER TABLE "booking_schema"."BookingPage"
  ADD COLUMN "preferredProvider" "booking_schema"."CalendarProvider";
