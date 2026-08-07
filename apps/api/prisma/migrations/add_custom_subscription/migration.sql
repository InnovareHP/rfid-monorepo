-- Sales-led contracts: one Subscription row with its entitlements stored as
-- data rather than looked up from the tier table. No new table, and no
-- per-contract feature flags table.

ALTER TABLE stripe_schema."Subscription"
  ADD COLUMN IF NOT EXISTS "isCustom" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "contractLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "customPriceCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "setupFeeCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "customLimits" JSONB;

-- Every gate filters on this before reading customLimits.
CREATE INDEX IF NOT EXISTS "Subscription_isCustom_idx"
  ON stripe_schema."Subscription" ("isCustom");
