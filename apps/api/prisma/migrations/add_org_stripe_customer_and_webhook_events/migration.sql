-- Moves billing to the organization: one Stripe customer per org rather than
-- per user, and adds the webhook dedupe table.
-- Additive only, one column and one new table.

ALTER TABLE auth_schema."Organization"
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeCustomerId_key"
  ON auth_schema."Organization" ("stripeCustomerId");

CREATE TABLE IF NOT EXISTS stripe_schema."WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_provider_eventId_key"
  ON stripe_schema."WebhookEvent" ("provider", "eventId");
