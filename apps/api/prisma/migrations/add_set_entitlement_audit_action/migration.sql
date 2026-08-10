-- Superadmins can now grant a negotiated contract from the admin dashboard, so
-- that change needs its own audited action.

ALTER TYPE auth_schema."AdminAction" ADD VALUE IF NOT EXISTS 'SET_ENTITLEMENT';
