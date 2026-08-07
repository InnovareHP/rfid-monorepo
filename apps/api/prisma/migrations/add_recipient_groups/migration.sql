-- Recipient filtering moves off the blast and into a reusable group. Every
-- existing blast keeps its audience by getting a group of its own, so the
-- drop below loses nothing.

CREATE TABLE IF NOT EXISTS marketing_schema."RecipientGroup" (
  "id"             TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL,
  "name"           TEXT NOT NULL,
  "description"    TEXT,
  "moduleType"     board_schema."ModuleType" NOT NULL DEFAULT 'LEAD',
  "filter"         JSONB NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdBy"      TEXT,
  CONSTRAINT "RecipientGroup_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RecipientGroup_organizationId_moduleType_idx"
  ON marketing_schema."RecipientGroup" ("organizationId", "moduleType");

ALTER TABLE marketing_schema."RecipientGroup"
  DROP CONSTRAINT IF EXISTS "RecipientGroup_organizationId_fkey",
  ADD CONSTRAINT "RecipientGroup_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES auth_schema."Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE marketing_schema."RecipientGroup"
  DROP CONSTRAINT IF EXISTS "RecipientGroup_createdBy_fkey",
  ADD CONSTRAINT "RecipientGroup_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES auth_schema."User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS marketing_schema."BlastGroup" (
  "blastId" TEXT NOT NULL,
  "groupId" TEXT NOT NULL,
  CONSTRAINT "BlastGroup_pkey" PRIMARY KEY ("blastId", "groupId")
);

CREATE INDEX IF NOT EXISTS "BlastGroup_groupId_idx"
  ON marketing_schema."BlastGroup" ("groupId");

ALTER TABLE marketing_schema."BlastGroup"
  DROP CONSTRAINT IF EXISTS "BlastGroup_blastId_fkey",
  ADD CONSTRAINT "BlastGroup_blastId_fkey"
    FOREIGN KEY ("blastId") REFERENCES marketing_schema."Blast"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE marketing_schema."BlastGroup"
  DROP CONSTRAINT IF EXISTS "BlastGroup_groupId_fkey",
  ADD CONSTRAINT "BlastGroup_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES marketing_schema."RecipientGroup"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: one group per existing blast, named after it, then linked.
INSERT INTO marketing_schema."RecipientGroup"
  ("id", "createdAt", "updatedAt", "name", "description", "moduleType", "filter", "organizationId", "createdBy")
SELECT
  gen_random_uuid()::TEXT,
  b."createdAt",
  b."updatedAt",
  LEFT(b."name", 120) || ' audience',
  'Migrated from the blast that used to carry this filter inline.',
  b."moduleType",
  b."audienceFilter",
  b."organizationId",
  b."createdBy"
FROM marketing_schema."Blast" b
WHERE NOT EXISTS (
  SELECT 1 FROM marketing_schema."BlastGroup" bg WHERE bg."blastId" = b."id"
);

INSERT INTO marketing_schema."BlastGroup" ("blastId", "groupId")
SELECT b."id", g."id"
FROM marketing_schema."Blast" b
JOIN marketing_schema."RecipientGroup" g
  ON g."organizationId" = b."organizationId"
 AND g."name" = LEFT(b."name", 120) || ' audience'
 AND g."filter" = b."audienceFilter"
ON CONFLICT DO NOTHING;

ALTER TABLE marketing_schema."Blast" DROP COLUMN IF EXISTS "audienceFilter";
