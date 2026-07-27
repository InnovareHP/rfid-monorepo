-- Adds email open tracking, inbound ingest addresses, and thread linkage on Activity.
-- Additive only, existing activities default to OUTBOUND with no tracking id.

CREATE TYPE board_schema."EmailDirection" AS ENUM ('OUTBOUND', 'INBOUND');

ALTER TABLE board_schema."Activity"
  ADD COLUMN IF NOT EXISTS "direction" board_schema."EmailDirection" NOT NULL DEFAULT 'OUTBOUND',
  ADD COLUMN IF NOT EXISTS "trackingId" TEXT,
  ADD COLUMN IF NOT EXISTS "threadToken" TEXT,
  ADD COLUMN IF NOT EXISTS "messageId" TEXT,
  ADD COLUMN IF NOT EXISTS "openCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "firstOpenedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "lastOpenedAt" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX IF NOT EXISTS "Activity_trackingId_key"
  ON board_schema."Activity" ("trackingId");
CREATE INDEX IF NOT EXISTS "Activity_threadToken_idx"
  ON board_schema."Activity" ("threadToken");
CREATE INDEX IF NOT EXISTS "Activity_organizationId_messageId_idx"
  ON board_schema."Activity" ("organizationId", "messageId");

CREATE TABLE IF NOT EXISTS board_schema."EmailOpenEvent" (
  "id" TEXT NOT NULL,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ipHash" TEXT,
  "clientType" TEXT,
  "activityId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "EmailOpenEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailOpenEvent_activityId_fkey" FOREIGN KEY ("activityId")
    REFERENCES board_schema."Activity" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EmailOpenEvent_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES auth_schema."Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EmailOpenEvent_activityId_idx"
  ON board_schema."EmailOpenEvent" ("activityId");
CREATE INDEX IF NOT EXISTS "EmailOpenEvent_organizationId_idx"
  ON board_schema."EmailOpenEvent" ("organizationId");

CREATE TABLE IF NOT EXISTS board_schema."EmailIngestAddress" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ingestKey" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "EmailIngestAddress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmailIngestAddress_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES auth_schema."Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailIngestAddress_ingestKey_key"
  ON board_schema."EmailIngestAddress" ("ingestKey");
CREATE UNIQUE INDEX IF NOT EXISTS "EmailIngestAddress_organizationId_key"
  ON board_schema."EmailIngestAddress" ("organizationId");
