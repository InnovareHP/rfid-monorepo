-- Adds the booking schema: per-host booking pages, weekly availability rules,
-- and confirmed/cancelled bookings linkable to an optional Board record.
-- Additive only, new schema and tables.

CREATE SCHEMA IF NOT EXISTS booking_schema;

CREATE TYPE booking_schema."BookingStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS booking_schema."BookingPage" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "locationLabel" TEXT,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "timezone" TEXT NOT NULL,
  "bufferBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
  "bufferAfterMinutes" INTEGER NOT NULL DEFAULT 0,
  "minNoticeHours" INTEGER NOT NULL DEFAULT 4,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "BookingPage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BookingPage_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES auth_schema."User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BookingPage_slug_key"
  ON booking_schema."BookingPage" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "BookingPage_organizationId_userId_key"
  ON booking_schema."BookingPage" ("organizationId", "userId");
CREATE INDEX IF NOT EXISTS "BookingPage_organizationId_idx"
  ON booking_schema."BookingPage" ("organizationId");

CREATE TABLE IF NOT EXISTS booking_schema."AvailabilityRule" (
  "id" TEXT NOT NULL,
  "bookingPageId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startMinute" INTEGER NOT NULL,
  "endMinute" INTEGER NOT NULL,
  CONSTRAINT "AvailabilityRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AvailabilityRule_bookingPageId_fkey" FOREIGN KEY ("bookingPageId")
    REFERENCES booking_schema."BookingPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AvailabilityRule_bookingPageId_dayOfWeek_idx"
  ON booking_schema."AvailabilityRule" ("bookingPageId", "dayOfWeek");

CREATE TABLE IF NOT EXISTS booking_schema."Booking" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bookingPageId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "boardId" TEXT,
  "inviteeName" TEXT NOT NULL,
  "inviteeEmail" TEXT NOT NULL,
  "inviteeNotes" TEXT,
  "startTime" TIMESTAMPTZ(3) NOT NULL,
  "endTime" TIMESTAMPTZ(3) NOT NULL,
  "status" booking_schema."BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  "calendarProvider" TEXT,
  "externalEventId" TEXT,
  "calendarSyncFailed" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Booking_bookingPageId_fkey" FOREIGN KEY ("bookingPageId")
    REFERENCES booking_schema."BookingPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Booking_boardId_fkey" FOREIGN KEY ("boardId")
    REFERENCES board_schema."Board" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_bookingPageId_startTime_key"
  ON booking_schema."Booking" ("bookingPageId", "startTime");
CREATE INDEX IF NOT EXISTS "Booking_bookingPageId_startTime_idx"
  ON booking_schema."Booking" ("bookingPageId", "startTime");
CREATE INDEX IF NOT EXISTS "Booking_organizationId_idx"
  ON booking_schema."Booking" ("organizationId");
CREATE INDEX IF NOT EXISTS "Booking_boardId_idx"
  ON booking_schema."Booking" ("boardId");
CREATE INDEX IF NOT EXISTS "Booking_userId_idx"
  ON booking_schema."Booking" ("userId");
