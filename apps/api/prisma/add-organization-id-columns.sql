-- Adds the nullable organizationId columns + indexes that the Prisma schema
-- (and the application writes) now expect on board_schema child tables.
-- Idempotent: safe to re-run. Run this if you applied the enum conversion by
-- hand but have not yet applied the rest of the schema changes.

BEGIN;

ALTER TABLE board_schema."FieldValue"    ADD COLUMN IF NOT EXISTS "organizationId" text;
ALTER TABLE board_schema."History"       ADD COLUMN IF NOT EXISTS "organizationId" text;
ALTER TABLE board_schema."FieldOption"   ADD COLUMN IF NOT EXISTS "organizationId" text;
ALTER TABLE board_schema."BoardRelation" ADD COLUMN IF NOT EXISTS "organizationId" text;

CREATE INDEX IF NOT EXISTS "FieldValue_organizationId_idx"    ON board_schema."FieldValue"("organizationId");
CREATE INDEX IF NOT EXISTS "History_organizationId_idx"       ON board_schema."History"("organizationId");
CREATE INDEX IF NOT EXISTS "FieldOption_organizationId_idx"   ON board_schema."FieldOption"("organizationId");
CREATE INDEX IF NOT EXISTS "BoardRelation_organizationId_idx" ON board_schema."BoardRelation"("organizationId");

COMMIT;
