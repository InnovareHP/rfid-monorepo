-- Deleting a column was already a soft delete, but nothing recorded when or by
-- whom, so the binned columns could not be listed or restored. Mirrors the
-- attribution FieldOption already carries.
ALTER TABLE board_schema."Field"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

ALTER TABLE board_schema."Field"
  DROP CONSTRAINT IF EXISTS "Field_deletedBy_fkey";

ALTER TABLE board_schema."Field"
  ADD CONSTRAINT "Field_deletedBy_fkey"
    FOREIGN KEY ("deletedBy") REFERENCES auth_schema."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Field_moduleId_isDeleted_deletedAt_idx"
  ON board_schema."Field" ("moduleId", "isDeleted", "deletedAt");

-- Columns binned before this existed have no timestamp; backfilling one keeps
-- the trash orderable instead of leaving nulls that sort unpredictably.
UPDATE board_schema."Field"
SET "deletedAt" = NOW()
WHERE "isDeleted" = true AND "deletedAt" IS NULL;
