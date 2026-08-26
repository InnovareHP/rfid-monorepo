-- Public product demo: prospect capture plus the demo-host rotation columns.
-- Additive only, safe to apply on a live database.

CREATE SCHEMA IF NOT EXISTS demo_schema;

DO $$ BEGIN
  CREATE TYPE demo_schema."DemoRequestStatus" AS ENUM (
    'NEW', 'SCHEDULED', 'COMPLETED', 'NO_SHOW', 'DISQUALIFIED', 'CANCELED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS demo_schema."DemoRequest" (
  "id"             TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL,
  "name"           TEXT NOT NULL,
  "email"          TEXT NOT NULL,
  "company"        TEXT,
  "phone"          TEXT,
  "teamSize"       TEXT,
  "notes"          TEXT,
  "source"         TEXT,
  "utmSource"      TEXT,
  "utmMedium"      TEXT,
  "utmCampaign"    TEXT,
  "status"         demo_schema."DemoRequestStatus" NOT NULL DEFAULT 'NEW',
  "bookingId"      TEXT,
  "assignedUserId" TEXT,
  "scheduledAt"    TIMESTAMPTZ(3),
  "outcomeNotes"   TEXT,
  CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DemoRequest_status_createdAt_idx"
  ON demo_schema."DemoRequest" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "DemoRequest_email_idx"
  ON demo_schema."DemoRequest" ("email");

-- Rotation state lives on the existing booking page, so one host needs no pool.
ALTER TABLE booking_schema."BookingPage"
  ADD COLUMN IF NOT EXISTS "demoEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE booking_schema."BookingPage"
  ADD COLUMN IF NOT EXISTS "demoLastAssignedAt" TIMESTAMPTZ(3);

ALTER TYPE auth_schema."AdminAction" ADD VALUE IF NOT EXISTS 'UPDATE_DEMO_REQUEST';
ALTER TYPE auth_schema."AdminAction" ADD VALUE IF NOT EXISTS 'SET_DEMO_HOST';
