-- Removing someone from an organization deletes their Member row, and these
-- three tables pointed at it with the default RESTRICT, so removing any liaison
-- who had ever logged a touchpoint, an expense or a trip failed on the foreign
-- key. The rows are financial and activity history and must survive the
-- membership, so each one now also carries the user id, the same way
-- FieldOption records who created and who binned an option.
ALTER TABLE liason_schema."Marketing" ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE liason_schema."Expense"   ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE liason_schema."Mileage"   ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- Backfill through the membership every existing row still has.
UPDATE liason_schema."Marketing" AS m
SET "userId" = mem."userId"
FROM auth_schema."Member" AS mem
WHERE m."memberId" = mem."id" AND m."userId" IS NULL;

UPDATE liason_schema."Expense" AS e
SET "userId" = mem."userId"
FROM auth_schema."Member" AS mem
WHERE e."memberId" = mem."id" AND e."userId" IS NULL;

UPDATE liason_schema."Mileage" AS mi
SET "userId" = mem."userId"
FROM auth_schema."Member" AS mem
WHERE mi."memberId" = mem."id" AND mi."userId" IS NULL;

-- memberId becomes nullable so the membership can go while the log stays.
ALTER TABLE liason_schema."Marketing" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE liason_schema."Expense"   ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE liason_schema."Mileage"   ALTER COLUMN "memberId" DROP NOT NULL;

ALTER TABLE liason_schema."Marketing"
  DROP CONSTRAINT IF EXISTS "Marketing_memberId_fkey",
  DROP CONSTRAINT IF EXISTS "Marketing_userId_fkey";
ALTER TABLE liason_schema."Expense"
  DROP CONSTRAINT IF EXISTS "Expense_memberId_fkey",
  DROP CONSTRAINT IF EXISTS "Expense_userId_fkey";
ALTER TABLE liason_schema."Mileage"
  DROP CONSTRAINT IF EXISTS "Mileage_memberId_fkey",
  DROP CONSTRAINT IF EXISTS "Mileage_userId_fkey";

ALTER TABLE liason_schema."Marketing"
  ADD CONSTRAINT "Marketing_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES auth_schema."Member"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Marketing_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth_schema."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE liason_schema."Expense"
  ADD CONSTRAINT "Expense_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES auth_schema."Member"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Expense_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth_schema."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE liason_schema."Mileage"
  ADD CONSTRAINT "Mileage_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES auth_schema."Member"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Mileage_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES auth_schema."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Marketing_userId_idx" ON liason_schema."Marketing" ("userId");
CREATE INDEX IF NOT EXISTS "Expense_userId_idx"   ON liason_schema."Expense" ("userId");
CREATE INDEX IF NOT EXISTS "Mileage_userId_idx"   ON liason_schema."Mileage" ("userId");
