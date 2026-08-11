-- The better-auth two-factor plugin writes verified and failedVerificationCount
-- on enrollment since 1.6.x. The columns did not exist, so prisma.twoFactor
-- .create() failed validation and no user could enable 2FA at all.
--
-- Written by hand rather than through prisma migrate dev, which would have
-- bundled the unrelated schema edits sitting in the working tree.

ALTER TABLE auth_schema."TwoFactor"
  ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "failedVerificationCount" INTEGER NOT NULL DEFAULT 0;

-- A row only existed once a user finished enrolling under the old plugin, so
-- defaulting every existing row to false would demand re-verification from
-- people who already completed it. Backfilled from the user flag rather than
-- blanket-true, so a half-finished enrollment stays unverified.
-- Physical names, not the better-auth field aliases: Prisma is what issues this
-- SQL, and the User model carries no @@map.
UPDATE auth_schema."TwoFactor" t
  SET "verified" = true
  FROM auth_schema."User" u
  WHERE t."userId" = u."id"
    AND u."twoFactorEnabled" = true;
