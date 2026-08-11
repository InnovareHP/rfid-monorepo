-- The append-only trigger blocked every DELETE, which enforced the retention
-- floor by making the table immortal. That is safe and unbounded: nothing could
-- ever purge, so growth had no ceiling and the eventual fix would have been
-- someone dropping rows by hand with the trigger disabled.
--
-- DELETE is now permitted only when both hold: the caller has opted in for the
-- current transaction, and the row is already past the retention floor. The age
-- check lives here rather than only in the query, so an app-side mistake cannot
-- delete a row inside the six-year window even with the opt-in set.
--
-- UPDATE stays blocked unconditionally. A retention purge removes whole rows; it
-- never rewrites one.

CREATE OR REPLACE FUNCTION auth_schema.audit_log_block_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND current_setting('audit.purge', true) = 'on'
     -- 2190 days = 6 years, the §164.316(b)(2)(i) minimum. Deliberately a
     -- literal and not a setting: a configurable floor is not a floor.
     AND OLD."createdAt" < now() - INTERVAL '2190 days'
  THEN
    RETURN OLD;
  END IF;

  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

-- Recreated so an existing database picks up the new function body under the
-- same trigger name.
DROP TRIGGER IF EXISTS audit_log_no_mutation ON auth_schema."AuditLog";

CREATE TRIGGER audit_log_no_mutation
  BEFORE UPDATE OR DELETE ON auth_schema."AuditLog"
  FOR EACH ROW EXECUTE FUNCTION auth_schema.audit_log_block_mutation();

-- The purge deletes by age, so it needs createdAt ordered on its own. The
-- existing indexes all lead with another column.
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx"
  ON auth_schema."AuditLog" ("createdAt");
