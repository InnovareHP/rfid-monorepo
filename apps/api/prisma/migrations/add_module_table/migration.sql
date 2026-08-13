-- Turns the ModuleType enum into data. Every org gets the four system modules
-- as rows, and the tables that carried the enum gain a nullable moduleId
-- pointing at them. Nothing reads moduleId yet, and moduleType is untouched, so
-- this migration is invisible to the app.
--
-- Labels match the current sidebar text exactly, so the data-driven sidebar in
-- a later phase renders the same words it does today.

CREATE TABLE IF NOT EXISTS board_schema."Module" (
  "id"             TEXT NOT NULL,
  "createdAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "key"            TEXT NOT NULL,
  "label"          TEXT NOT NULL,
  "labelSingular"  TEXT NOT NULL,
  "icon"           TEXT,
  "isSystem"       BOOLEAN NOT NULL DEFAULT false,
  "isArchived"     BOOLEAN NOT NULL DEFAULT false,
  "moduleOrder"    INTEGER NOT NULL DEFAULT 0,
  "organizationId" TEXT NOT NULL,
  CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Module_organizationId_key_key"
  ON board_schema."Module" ("organizationId", "key");

CREATE INDEX IF NOT EXISTS "Module_organizationId_isArchived_moduleOrder_idx"
  ON board_schema."Module" ("organizationId", "isArchived", "moduleOrder");

ALTER TABLE board_schema."Module"
  DROP CONSTRAINT IF EXISTS "Module_organizationId_fkey",
  ADD CONSTRAINT "Module_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES auth_schema."Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- One row per (organization, enum value). Re-runnable: the unique index makes
-- the insert a no-op for orgs already seeded.
INSERT INTO board_schema."Module" (
  "id", "key", "label", "labelSingular", "icon", "isSystem", "moduleOrder", "organizationId"
)
SELECT
  gen_random_uuid()::text,
  seed."key",
  seed."label",
  seed."labelSingular",
  seed."icon",
  true,
  seed."moduleOrder",
  org."id"
FROM auth_schema."Organization" org
CROSS JOIN (
  VALUES
    ('LEAD',     'Master Marketing List', 'Lead',     'FileText',  0),
    ('REFERRAL', 'Referral Logs',         'Referral', 'Users',     1),
    ('CONTACT',  'Phonebook',             'Contact',  'Contact',   2),
    ('COMPANY',  'Companies',             'Company',  'Building2', 3)
) AS seed ("key", "label", "labelSingular", "icon", "moduleOrder")
ON CONFLICT ("organizationId", "key") DO NOTHING;

ALTER TABLE board_schema."Field"      ADD COLUMN IF NOT EXISTS "moduleId" TEXT;
ALTER TABLE board_schema."Board"      ADD COLUMN IF NOT EXISTS "moduleId" TEXT;
ALTER TABLE marketing_schema."RecipientGroup" ADD COLUMN IF NOT EXISTS "moduleId" TEXT;
ALTER TABLE marketing_schema."Form"           ADD COLUMN IF NOT EXISTS "moduleId" TEXT;

UPDATE board_schema."Field" f
SET "moduleId" = m."id"
FROM board_schema."Module" m
WHERE m."organizationId" = f."organizationId"
  AND m."key" = f."moduleType"::text
  AND f."moduleId" IS NULL;

UPDATE board_schema."Board" b
SET "moduleId" = m."id"
FROM board_schema."Module" m
WHERE m."organizationId" = b."organizationId"
  AND m."key" = b."moduleType"::text
  AND b."moduleId" IS NULL;

UPDATE marketing_schema."RecipientGroup" g
SET "moduleId" = m."id"
FROM board_schema."Module" m
WHERE m."organizationId" = g."organizationId"
  AND m."key" = g."moduleType"::text
  AND g."moduleId" IS NULL;

UPDATE marketing_schema."Form" fo
SET "moduleId" = m."id"
FROM board_schema."Module" m
WHERE m."organizationId" = fo."organizationId"
  AND m."key" = fo."moduleType"::text
  AND fo."moduleId" IS NULL;

-- Records and fields belong to their module, so an empty module deleting its
-- own field definitions is the intended path. Board cascades rather than
-- restricts because it soft-deletes: a module the app counts as empty can still
-- hold isDeleted rows, and RESTRICT would refuse a delete the UI just offered.
-- Groups and forms are references rather than contents, and neither soft-
-- deletes, so RESTRICT blocks the delete and names what still points at the
-- module instead of leaving a form that submits into nothing.
ALTER TABLE board_schema."Field"
  DROP CONSTRAINT IF EXISTS "Field_moduleId_fkey",
  ADD CONSTRAINT "Field_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES board_schema."Module"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE board_schema."Board"
  DROP CONSTRAINT IF EXISTS "Board_moduleId_fkey",
  ADD CONSTRAINT "Board_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES board_schema."Module"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE marketing_schema."RecipientGroup"
  DROP CONSTRAINT IF EXISTS "RecipientGroup_moduleId_fkey",
  ADD CONSTRAINT "RecipientGroup_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES board_schema."Module"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE marketing_schema."Form"
  DROP CONSTRAINT IF EXISTS "Form_moduleId_fkey",
  ADD CONSTRAINT "Form_moduleId_fkey"
    FOREIGN KEY ("moduleId") REFERENCES board_schema."Module"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Field_moduleId_isDeleted_fieldOrder_idx"
  ON board_schema."Field" ("moduleId", "isDeleted", "fieldOrder");

CREATE INDEX IF NOT EXISTS "Board_moduleId_isDeleted_createdAt_idx"
  ON board_schema."Board" ("moduleId", "isDeleted", "createdAt");
