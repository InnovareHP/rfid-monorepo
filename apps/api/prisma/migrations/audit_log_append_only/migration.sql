-- Append-only guard for the audit trail (HIPAA 164.312(b), 164.312(c)(1)).
--
-- Covers AuditLog and AdminActivityLog. Not History: that table doubles as the
-- user-editable record timeline and the board is allowed to edit and delete it.
-- Not ContractAgreement: it cascades from Organization, so locking it would
-- block organization deletion.
--
-- UPDATE and TRUNCATE are refused outright. DELETE is refused unless the caller
-- has opted in for the transaction AND the row is past the six-year floor, which
-- is what the retention job does. Idempotent, safe to apply on a live database.

CREATE OR REPLACE FUNCTION auth_schema.audit_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  -- Mirrors AUDIT_RETENTION_DAYS in audit-retention.service.ts. The constant
  -- there decides when the job bothers looking; this one decides what is
  -- allowed to go, so a bug in the job cannot shorten retention.
  retention_days CONSTANT integer := 2190;
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'audit trail is append-only: % cannot be truncated', TG_TABLE_NAME
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'audit trail is append-only: % cannot be updated', TG_TABLE_NAME
      USING ERRCODE = 'restrict_violation';
  END IF;

  -- Set transaction-locally by the retention job and by nothing else.
  IF current_setting('audit.purge', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'audit trail is append-only: % cannot be deleted', TG_TABLE_NAME
      USING ERRCODE = 'restrict_violation';
  END IF;

  IF OLD."createdAt" > now() - make_interval(days => retention_days) THEN
    RAISE EXCEPTION
      'audit row % is inside the % day retention floor', OLD."id", retention_days
      USING ERRCODE = 'restrict_violation';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS audit_log_append_only ON auth_schema."AuditLog";
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON auth_schema."AuditLog"
  FOR EACH ROW EXECUTE FUNCTION auth_schema.audit_append_only();

DROP TRIGGER IF EXISTS audit_log_no_truncate ON auth_schema."AuditLog";
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON auth_schema."AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION auth_schema.audit_append_only();

DROP TRIGGER IF EXISTS admin_activity_log_append_only ON auth_schema."AdminActivityLog";
CREATE TRIGGER admin_activity_log_append_only
  BEFORE UPDATE OR DELETE ON auth_schema."AdminActivityLog"
  FOR EACH ROW EXECUTE FUNCTION auth_schema.audit_append_only();

DROP TRIGGER IF EXISTS admin_activity_log_no_truncate ON auth_schema."AdminActivityLog";
CREATE TRIGGER admin_activity_log_no_truncate
  BEFORE TRUNCATE ON auth_schema."AdminActivityLog"
  FOR EACH STATEMENT EXECUTE FUNCTION auth_schema.audit_append_only();
