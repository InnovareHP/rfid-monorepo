-- Saved reports for the Scale tier. A report is a named query over one module:
-- which columns, what filter, and how far back. Running it reuses the board
-- read path, so nothing here copies the record shape.

CREATE TABLE IF NOT EXISTS board_schema."SavedReport" (
  "id"             TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name"           TEXT NOT NULL,
  "columnIds"      TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "filter"         JSONB NOT NULL DEFAULT '{}'::jsonb,
  "rangeDays"      INTEGER,
  "moduleId"       TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdBy"      TEXT,
  CONSTRAINT "SavedReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SavedReport_organizationId_moduleId_idx"
  ON board_schema."SavedReport" ("organizationId", "moduleId");

ALTER TABLE board_schema."SavedReport"
  DROP CONSTRAINT IF EXISTS "SavedReport_moduleId_fkey",
  ADD CONSTRAINT "SavedReport_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES board_schema."Module"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE board_schema."SavedReport"
  DROP CONSTRAINT IF EXISTS "SavedReport_organizationId_fkey",
  ADD CONSTRAINT "SavedReport_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES auth_schema."Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE board_schema."SavedReport"
  DROP CONSTRAINT IF EXISTS "SavedReport_createdBy_fkey",
  ADD CONSTRAINT "SavedReport_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES auth_schema."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
