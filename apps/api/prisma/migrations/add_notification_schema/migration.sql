-- Adds the notification schema: generic per-member in-app notifications that
-- any feature can emit into. Additive only, new schema and table.

CREATE SCHEMA IF NOT EXISTS notification_schema;

CREATE TABLE IF NOT EXISTS notification_schema."Notification" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "link" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "readAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "organizationId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "actorUserId" TEXT,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES auth_schema."Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId")
    REFERENCES auth_schema."Member" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Notification_actorUserId_fkey" FOREIGN KEY ("actorUserId")
    REFERENCES auth_schema."User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notification_org_recipient_read_created_idx"
  ON notification_schema."Notification" ("organizationId", "recipientId", "readAt", "createdAt");

CREATE INDEX IF NOT EXISTS "Notification_entityType_entityId_idx"
  ON notification_schema."Notification" ("entityType", "entityId");
