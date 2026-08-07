-- The public booking page offers video, in person, or both; a booking records
-- the one the invitee picked so a later page edit cannot rewrite it.

CREATE TYPE booking_schema."LocationType" AS ENUM ('VIDEO', 'IN_PERSON', 'BOTH');
CREATE TYPE booking_schema."BookingLocation" AS ENUM ('VIDEO', 'IN_PERSON');

ALTER TABLE booking_schema."BookingPage"
  ADD COLUMN IF NOT EXISTS "locationType" booking_schema."LocationType"
  NOT NULL DEFAULT 'VIDEO';

ALTER TABLE booking_schema."Booking"
  ADD COLUMN IF NOT EXISTS "locationType" booking_schema."BookingLocation"
  NOT NULL DEFAULT 'VIDEO';

-- A page that already filled in a location label was describing a place, so it
-- carries forward as in-person rather than silently becoming a video call.
UPDATE booking_schema."BookingPage"
  SET "locationType" = 'IN_PERSON'
  WHERE "locationLabel" IS NOT NULL AND btrim("locationLabel") <> '';
