-- Who added an option and who binned it. Deleting an option was already a soft
-- delete; this records the actor and the time so the trash can be listed,
-- attributed and restored.
ALTER TABLE board_schema."FieldOption"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

ALTER TABLE board_schema."FieldOption"
  DROP CONSTRAINT IF EXISTS "FieldOption_createdBy_fkey",
  DROP CONSTRAINT IF EXISTS "FieldOption_deletedBy_fkey";

ALTER TABLE board_schema."FieldOption"
  ADD CONSTRAINT "FieldOption_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES auth_schema."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "FieldOption_deletedBy_fkey"
    FOREIGN KEY ("deletedBy") REFERENCES auth_schema."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "FieldOption_fieldId_isDeleted_deletedAt_idx"
  ON board_schema."FieldOption" ("fieldId", "isDeleted", "deletedAt");

-- Options binned before this existed have no timestamp; backfilling one keeps
-- the trash orderable instead of leaving nulls that sort unpredictably.
UPDATE board_schema."FieldOption"
SET "deletedAt" = NOW()
WHERE "isDeleted" = true AND "deletedAt" IS NULL;
