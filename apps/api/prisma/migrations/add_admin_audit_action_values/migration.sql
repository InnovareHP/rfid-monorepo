-- Adds the admin actions that previously went straight to Better Auth from the
-- browser and left no audit row: password resets, session revocations, and
-- admin user edits such as marking an email verified.

ALTER TYPE auth_schema."AdminAction" ADD VALUE IF NOT EXISTS 'SET_PASSWORD';
ALTER TYPE auth_schema."AdminAction" ADD VALUE IF NOT EXISTS 'REVOKE_SESSIONS';
ALTER TYPE auth_schema."AdminAction" ADD VALUE IF NOT EXISTS 'UPDATE_USER';
