-- A campaign chooses how its mail leaves: the sender's connected mailbox, a
-- subdomain we run, or a domain the customer owns and verifies with DNS.
-- Replies always go to a real inbox via Reply-To; we host none.

DO $$ BEGIN
  CREATE TYPE marketing_schema."SenderKind" AS ENUM ('PERSONAL', 'MANAGED_DOMAIN', 'CUSTOM_DOMAIN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE marketing_schema."SenderStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS marketing_schema."SenderIdentity" (
  "id"             TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL,
  "label"          TEXT NOT NULL,
  "kind"           marketing_schema."SenderKind" NOT NULL,
  "status"         marketing_schema."SenderStatus" NOT NULL DEFAULT 'PENDING',
  "fromEmail"      TEXT NOT NULL,
  "fromName"       TEXT,
  "domain"         TEXT,
  "dnsRecords"     JSONB,
  "verifiedAt"     TIMESTAMPTZ(3),
  "replyTo"        TEXT,
  "mailboxUserId"  TEXT,
  "organizationId" TEXT NOT NULL,
  "createdBy"      TEXT,
  CONSTRAINT "SenderIdentity_pkey" PRIMARY KEY ("id")
);

-- NULL domains (personal) are exempt from a unique index in Postgres, which is
-- what lets an org keep several personal senders.
CREATE UNIQUE INDEX IF NOT EXISTS "SenderIdentity_organizationId_domain_key"
  ON marketing_schema."SenderIdentity" ("organizationId", "domain");

CREATE INDEX IF NOT EXISTS "SenderIdentity_organizationId_status_idx"
  ON marketing_schema."SenderIdentity" ("organizationId", "status");

ALTER TABLE marketing_schema."SenderIdentity"
  DROP CONSTRAINT IF EXISTS "SenderIdentity_organizationId_fkey",
  ADD CONSTRAINT "SenderIdentity_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES auth_schema."Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE marketing_schema."SenderIdentity"
  DROP CONSTRAINT IF EXISTS "SenderIdentity_mailboxUserId_fkey",
  ADD CONSTRAINT "SenderIdentity_mailboxUserId_fkey"
    FOREIGN KEY ("mailboxUserId") REFERENCES auth_schema."User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE marketing_schema."SenderIdentity"
  DROP CONSTRAINT IF EXISTS "SenderIdentity_createdBy_fkey",
  ADD CONSTRAINT "SenderIdentity_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES auth_schema."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE marketing_schema."Campaign"
  ADD COLUMN IF NOT EXISTS "senderIdentityId" TEXT;

ALTER TABLE marketing_schema."Campaign"
  DROP CONSTRAINT IF EXISTS "Campaign_senderIdentityId_fkey",
  ADD CONSTRAINT "Campaign_senderIdentityId_fkey"
    FOREIGN KEY ("senderIdentityId") REFERENCES marketing_schema."SenderIdentity"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
