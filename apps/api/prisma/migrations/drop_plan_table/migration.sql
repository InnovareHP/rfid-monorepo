-- The plan catalog lives in apps/api/src/lib/stripe/plans.ts and its limits in
-- packages/shared/src/lib/entitlement.ts. This table was a second, unread copy:
-- nothing queried it once /plan/list was retired in favour of /billing/plans.

DROP TABLE IF EXISTS stripe_schema."Plan";
