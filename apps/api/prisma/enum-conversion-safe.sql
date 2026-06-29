-- SAFE enum conversion (preserves data) for the board_schema discriminators.
-- Use these statements IN PLACE OF the drop/recreate that `prisma db push`
-- (or an unedited `migrate` diff) generates for these three columns.
--
-- The `USING col::enum` cast only works if every existing value is already a
-- valid enum member. Verify first:
--
--   SELECT DISTINCT "moduleType"   FROM board_schema."Board";
--   SELECT DISTINCT "moduleType"   FROM board_schema."Field";
--   SELECT DISTINCT "relationType" FROM board_schema."BoardRelation";
--
-- Expected: only LEAD/REFERRAL and REFERRAL_LINK/FACILITY_LINK. Fix any stray
-- value before running this.

BEGIN;

-- Idempotent: skip creation if the type already exists (e.g. a prior
-- partial `db push`/migrate run already created it).
DO $$ BEGIN
  CREATE TYPE "board_schema"."ModuleType" AS ENUM ('LEAD', 'REFERRAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "board_schema"."RelationType" AS ENUM ('REFERRAL_LINK', 'FACILITY_LINK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "board_schema"."Field"
  ALTER COLUMN "moduleType" DROP DEFAULT,
  ALTER COLUMN "moduleType" TYPE "board_schema"."ModuleType"
    USING ("moduleType"::"board_schema"."ModuleType"),
  ALTER COLUMN "moduleType" SET DEFAULT 'LEAD';

ALTER TABLE "board_schema"."Board"
  ALTER COLUMN "moduleType" DROP DEFAULT,
  ALTER COLUMN "moduleType" TYPE "board_schema"."ModuleType"
    USING ("moduleType"::"board_schema"."ModuleType"),
  ALTER COLUMN "moduleType" SET DEFAULT 'LEAD';

ALTER TABLE "board_schema"."BoardRelation"
  ALTER COLUMN "relationType" DROP DEFAULT,
  ALTER COLUMN "relationType" TYPE "board_schema"."RelationType"
    USING ("relationType"::"board_schema"."RelationType"),
  ALTER COLUMN "relationType" SET DEFAULT 'REFERRAL_LINK';

COMMIT;
