-- A sidebar folder used to be board_schema."Module"."groupName", a free-text
-- label repeated on every member. A folder is now a row of its own, so it can
-- exist before its first module and be renamed in one place.
--
-- Apply this before backfill_module_groups, which fills the table from the old
-- labels. Idempotent: a second run changes nothing.

CREATE TABLE IF NOT EXISTS board_schema."ModuleGroup" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "groupOrder" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "ModuleGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ModuleGroup_organizationId_name_key"
  ON board_schema."ModuleGroup" ("organizationId", "name");

CREATE INDEX IF NOT EXISTS "ModuleGroup_organizationId_groupOrder_idx"
  ON board_schema."ModuleGroup" ("organizationId", "groupOrder");

-- Deleting an organization takes its folders with it, the way its modules go.
ALTER TABLE board_schema."ModuleGroup"
  DROP CONSTRAINT IF EXISTS "ModuleGroup_organizationId_fkey";

ALTER TABLE board_schema."ModuleGroup"
  ADD CONSTRAINT "ModuleGroup_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES auth_schema."Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE board_schema."Module"
  ADD COLUMN IF NOT EXISTS "groupId" TEXT;

-- Deleting a folder is a display change, so its modules return to the top
-- level rather than going with it.
ALTER TABLE board_schema."Module"
  DROP CONSTRAINT IF EXISTS "Module_groupId_fkey";

ALTER TABLE board_schema."Module"
  ADD CONSTRAINT "Module_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES board_schema."ModuleGroup"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Module_organizationId_groupId_moduleOrder_idx"
  ON board_schema."Module" ("organizationId", "groupId", "moduleOrder");

-- The label is read by nothing once the backfill has run; its index goes now
-- and the column itself once every environment is past this.
DROP INDEX IF EXISTS board_schema."Module_organizationId_groupName_moduleOrder_idx";
