-- Admin-provisioned accounts are created outside the Better Auth admin routes,
-- so the audit log needs its own action rather than reading as an update.
ALTER TYPE auth_schema."AdminAction" ADD VALUE IF NOT EXISTS 'CREATE_USER';
