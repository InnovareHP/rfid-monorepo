-- Join URL minted alongside the calendar event (Google Meet or Microsoft Teams).
ALTER TABLE "booking_schema"."Booking" ADD COLUMN "meetingUrl" TEXT;
