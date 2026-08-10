-- Lets the database supply the id and the timestamps so an insert outside Better
-- Auth, such as password signup, does not hand-roll them. Better Auth keeps
-- sending its own values, and a default only applies to an omitted column.

ALTER TABLE auth_schema."User"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();

ALTER TABLE auth_schema."UserAccount"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid(),
  ALTER COLUMN "createdAt" SET DEFAULT now(),
  ALTER COLUMN "updatedAt" SET DEFAULT now();
