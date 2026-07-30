-- AuditLog append-only enforcement (HIPAA §164.312(b) tamper resistance).
-- Blocks UPDATE and DELETE at the database level regardless of app code.

CREATE OR REPLACE FUNCTION auth_schema.audit_log_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_no_mutation ON auth_schema."AuditLog";

CREATE TRIGGER audit_log_no_mutation
  BEFORE UPDATE OR DELETE ON auth_schema."AuditLog"
  FOR EACH ROW EXECUTE FUNCTION auth_schema.audit_log_block_mutation();
