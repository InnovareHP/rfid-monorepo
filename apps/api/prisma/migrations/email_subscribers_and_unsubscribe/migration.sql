-- Consent lives on the address, not the record: one opt-out silences every
-- group and module that shares it. The address itself is encrypted, so lookups
-- go through emailHash, a keyed HMAC of the normalized address.

DO $$
BEGIN
  CREATE TYPE marketing_schema."SubscriberStatus" AS ENUM ('SUBSCRIBED', 'UNSUBSCRIBED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE marketing_schema."SubscriberSource" AS ENUM ('FORM', 'MANUAL', 'IMPORT', 'BLAST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE marketing_schema."AudienceType" AS ENUM ('BOARD', 'SUBSCRIBER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS marketing_schema."EmailSubscriber" (
  "id"             TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL,
  "email"          TEXT NOT NULL,
  "emailHash"      TEXT NOT NULL,
  "name"           TEXT,
  "status"         marketing_schema."SubscriberStatus" NOT NULL DEFAULT 'SUBSCRIBED',
  "source"         marketing_schema."SubscriberSource" NOT NULL DEFAULT 'MANUAL',
  "subscribedAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unsubscribedAt" TIMESTAMPTZ(3),
  "organizationId" TEXT NOT NULL,
  "recordId"       TEXT,
  CONSTRAINT "EmailSubscriber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailSubscriber_organizationId_emailHash_key"
  ON marketing_schema."EmailSubscriber"("organizationId", "emailHash");
CREATE INDEX IF NOT EXISTS "EmailSubscriber_organizationId_status_idx"
  ON marketing_schema."EmailSubscriber"("organizationId", "status");

DO $$
BEGIN
  ALTER TABLE marketing_schema."EmailSubscriber"
    ADD CONSTRAINT "EmailSubscriber_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES auth_schema."Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE marketing_schema."EmailSubscriber"
    ADD CONSTRAINT "EmailSubscriber_recordId_fkey"
    FOREIGN KEY ("recordId") REFERENCES board_schema."Board"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- A group now names where it reads recipients from.
ALTER TABLE marketing_schema."RecipientGroup"
  ADD COLUMN IF NOT EXISTS "audienceType" marketing_schema."AudienceType" NOT NULL DEFAULT 'BOARD';

-- A recipient is either a CRM record or a subscriber, so recordId becomes
-- optional and gains a sibling. NULLs are distinct in Postgres, so the two
-- unique keys never collide.
ALTER TABLE marketing_schema."BlastRecipient"
  ALTER COLUMN "recordId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "subscriberId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "BlastRecipient_blastId_subscriberId_key"
  ON marketing_schema."BlastRecipient"("blastId", "subscriberId");

DO $$
BEGIN
  ALTER TABLE marketing_schema."BlastRecipient"
    ADD CONSTRAINT "BlastRecipient_subscriberId_fkey"
    FOREIGN KEY ("subscriberId") REFERENCES marketing_schema."EmailSubscriber"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
