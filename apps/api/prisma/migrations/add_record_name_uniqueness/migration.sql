-- recordName is encrypted at rest with a random IV, so duplicate names are
-- invisible to SQL: two rows holding the same name have different ciphertext.
-- Board.recordNameHash is a keyed blind index over the normalized name, and
-- this is the constraint that makes a duplicate impossible rather than merely
-- detected.
--
-- RUN ORDER. This index will fail to build if duplicates already exist, and
-- the hash column is empty until it is backfilled, so:
--
--   1. pnpm prisma:migrate            -- adds the columns and their plain indexes
--   2. pnpm --filter api backfill:record-name-hash
--   3. pnpm --filter api audit:duplicate-record-names   -- resolve what it lists
--   4. apply this file
--
-- Partial on isDeleted, matching Field and FieldOption above: a soft-deleted
-- record must not hold its name hostage against re-creating one. Prisma cannot
-- express a partial unique index, so this stays hand-written and is absent
-- from schema.prisma.
--
-- REFERRAL is deliberately excluded. The same patient can genuinely be
-- referred more than once, so a repeated name there is data, not an error.
-- Referral rows are still indexed, so the audit script and the near-match flag
-- still see them; only the refusal is scoped to the account modules.

CREATE UNIQUE INDEX IF NOT EXISTS "Board_org_module_name_hash_active_key"
  ON board_schema."Board" ("organizationId", (COALESCE("moduleId", '')), "recordNameHash")
  WHERE "isDeleted" = false
    AND "recordNameHash" IS NOT NULL
    AND "moduleType" <> 'REFERRAL';
