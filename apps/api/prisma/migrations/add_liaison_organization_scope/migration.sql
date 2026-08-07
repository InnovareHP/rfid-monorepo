-- Gives Expense, Mileage and Marketing their own organizationId so the tenant
-- extension scopes them by construction instead of through Member, which is
-- excluded from SCOPED_MODELS as an auth-managed model.

ALTER TABLE liason_schema."Expense" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE liason_schema."Mileage" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
ALTER TABLE liason_schema."Marketing" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

UPDATE liason_schema."Expense" e
SET "organizationId" = m."organizationId"
FROM auth_schema."Member" m
WHERE m."id" = e."memberId" AND e."organizationId" IS NULL;

UPDATE liason_schema."Mileage" mi
SET "organizationId" = m."organizationId"
FROM auth_schema."Member" m
WHERE m."id" = mi."memberId" AND mi."organizationId" IS NULL;

UPDATE liason_schema."Marketing" mk
SET "organizationId" = m."organizationId"
FROM auth_schema."Member" m
WHERE m."id" = mk."memberId" AND mk."organizationId" IS NULL;

ALTER TABLE liason_schema."Expense" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE liason_schema."Mileage" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE liason_schema."Marketing" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE liason_schema."Expense"
  ADD CONSTRAINT "Expense_organizationId_fkey" FOREIGN KEY ("organizationId")
  REFERENCES auth_schema."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE liason_schema."Mileage"
  ADD CONSTRAINT "Mileage_organizationId_fkey" FOREIGN KEY ("organizationId")
  REFERENCES auth_schema."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE liason_schema."Marketing"
  ADD CONSTRAINT "Marketing_organizationId_fkey" FOREIGN KEY ("organizationId")
  REFERENCES auth_schema."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Expense_organizationId_idx" ON liason_schema."Expense"("organizationId");
CREATE INDEX IF NOT EXISTS "Mileage_organizationId_idx" ON liason_schema."Mileage"("organizationId");
CREATE INDEX IF NOT EXISTS "Marketing_organizationId_idx" ON liason_schema."Marketing"("organizationId");
