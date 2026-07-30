-- The @better-auth/stripe 1.6.25 subscription schema declares four fields the
-- model never had, so every plugin write rejected at Prisma.
-- Additive only, four nullable columns.

ALTER TABLE stripe_schema."Subscription"
  ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "billingInterval" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeScheduleId" TEXT;
