-- The admission_manager role is gone. Its members become admins, which is a
-- superset of what they had, so nobody loses access. An unmigrated row would
-- fail closed on every permission check instead.
UPDATE auth_schema."Member"
SET "role" = 'admin'
WHERE "role" = 'admission_manager';

-- Invitations already sent for the old role would create a member nobody can
-- authorize, so they move with it.
UPDATE auth_schema."Invitation"
SET "role" = 'admin'
WHERE "role" = 'admission_manager';
