-- Links History rows to the Field they changed so a field rename no longer orphans history.
-- Backfills by matching the stored column name to a live field in the record's org and module.

ALTER TABLE board_schema."History"
  ADD COLUMN IF NOT EXISTS "fieldId" TEXT;

UPDATE board_schema."History" h
SET "fieldId" = f.id
FROM board_schema."Board" b
JOIN board_schema."Field" f
  ON f."organizationId" = b."organizationId"
 AND f."moduleType" = b."moduleType"
 AND f."isDeleted" = false
WHERE b.id = h."recordId"
  AND f."fieldName" = h."column"
  AND h."fieldId" IS NULL;

CREATE INDEX IF NOT EXISTS "History_fieldId_idx"
  ON board_schema."History" ("fieldId");

ALTER TABLE board_schema."History"
  ADD CONSTRAINT "History_fieldId_fkey"
  FOREIGN KEY ("fieldId") REFERENCES board_schema."Field"(id)
  ON DELETE SET NULL ON UPDATE CASCADE;
