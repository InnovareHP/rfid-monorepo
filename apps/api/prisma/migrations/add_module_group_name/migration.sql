-- The CRM sidebar lists every module in one flat group. An organization can
-- hold four system modules plus ten custom ones, and past roughly eight rows
-- the list stops reading as a menu.
--
-- groupName is a display label only: it does not scope records, fields or
-- permissions, and a module keeps working unchanged while it is null. Existing
-- rows therefore need no backfill — null means ungrouped, which is exactly how
-- the sidebar renders today.

ALTER TABLE board_schema."Module"
  ADD COLUMN IF NOT EXISTS "groupName" TEXT;

CREATE INDEX IF NOT EXISTS "Module_organizationId_groupName_moduleOrder_idx"
  ON board_schema."Module" ("organizationId", "groupName", "moduleOrder");
