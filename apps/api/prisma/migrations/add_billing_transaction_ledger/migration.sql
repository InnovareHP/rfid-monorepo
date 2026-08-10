-- Our own itemized billing ledger, alongside the Stripe invoices the billing
-- page already reads. Additive only: one table and two enums, nothing altered.

DO $$ BEGIN
  CREATE TYPE stripe_schema."TransactionType" AS ENUM (
    'SUBSCRIPTION', 'SEAT_CHANGE', 'REFUND', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stripe_schema."TransactionStatus" AS ENUM (
    'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS stripe_schema."Transaction" (
  "id"              TEXT NOT NULL,
  "organizationId"  TEXT NOT NULL,
  "memberId"        TEXT,
  "type"            stripe_schema."TransactionType" NOT NULL,
  "status"          stripe_schema."TransactionStatus" NOT NULL,
  "amountCents"     INTEGER NOT NULL,
  "currency"        TEXT NOT NULL DEFAULT 'usd',
  "description"     TEXT NOT NULL,
  "stripeInvoiceId" TEXT,
  "stripeSessionId" TEXT,
  "metadata"        JSONB,
  "createdAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Transaction_organizationId_createdAt_idx"
  ON stripe_schema."Transaction" ("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_memberId_idx"
  ON stripe_schema."Transaction" ("memberId");
CREATE INDEX IF NOT EXISTS "Transaction_type_status_idx"
  ON stripe_schema."Transaction" ("type", "status");
CREATE INDEX IF NOT EXISTS "Transaction_stripeInvoiceId_idx"
  ON stripe_schema."Transaction" ("stripeInvoiceId");
