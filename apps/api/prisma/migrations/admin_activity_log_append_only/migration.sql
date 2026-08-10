-- AdminActivityLog kept for the life of the record, not the life of the account.
-- The adminId foreign key cascaded, so hard-deleting a super admin deleted that
-- admin's own action history. Names are snapshotted, both foreign keys are
-- dropped, and UPDATE/DELETE are blocked at the database level the same way
-- AuditLog already is (HIPAA 164.312(b) tamper resistance).

ALTER TABLE auth_schema."AdminActivityLog"
  ADD COLUMN IF NOT EXISTS "adminName" TEXT,
  ADD COLUMN IF NOT EXISTS "targetName" TEXT;

-- Backfill from the accounts that still exist; rows whose admin is already gone
-- keep a placeholder so the column can be NOT NULL.
UPDATE auth_schema."AdminActivityLog" l
SET "adminName" = u."name"
FROM auth_schema."User" u
WHERE l."adminId" = u."id" AND l."adminName" IS NULL;

UPDATE auth_schema."AdminActivityLog" l
SET "targetName" = u."name"
FROM auth_schema."User" u
WHERE l."targetUserId" = u."id" AND l."targetName" IS NULL;

UPDATE auth_schema."AdminActivityLog"
SET "adminName" = 'Deleted account'
WHERE "adminName" IS NULL;

ALTER TABLE auth_schema."AdminActivityLog"
  ALTER COLUMN "adminName" SET NOT NULL;

ALTER TABLE auth_schema."AdminActivityLog"
  DROP CONSTRAINT IF EXISTS "AdminActivityLog_adminId_fkey",
  DROP CONSTRAINT IF EXISTS "AdminActivityLog_targetUserId_fkey";

CREATE INDEX IF NOT EXISTS "AdminActivityLog_adminId_createdAt_idx"
  ON auth_schema."AdminActivityLog" ("adminId", "createdAt");

CREATE INDEX IF NOT EXISTS "AdminActivityLog_action_createdAt_idx"
  ON auth_schema."AdminActivityLog" ("action", "createdAt");

CREATE OR REPLACE FUNCTION auth_schema.admin_activity_log_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AdminActivityLog is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_activity_log_no_mutation ON auth_schema."AdminActivityLog";

CREATE TRIGGER admin_activity_log_no_mutation
  BEFORE UPDATE OR DELETE ON auth_schema."AdminActivityLog"
  FOR EACH ROW EXECUTE FUNCTION auth_schema.admin_activity_log_block_mutation();
