-- A dashboard can now belong to one module, which makes it that module's
-- analytics page. Existing dashboards stay module-less and keep working.
ALTER TABLE board_schema."CustomAnalyticDashboard"
  ADD COLUMN IF NOT EXISTS "moduleId" TEXT,
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE board_schema."CustomAnalyticDashboard"
  DROP CONSTRAINT IF EXISTS "CustomAnalyticDashboard_moduleId_fkey";

ALTER TABLE board_schema."CustomAnalyticDashboard"
  ADD CONSTRAINT "CustomAnalyticDashboard_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES board_schema."Module"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "CustomAnalyticDashboard_organizationId_moduleId_idx"
  ON board_schema."CustomAnalyticDashboard" ("organizationId", "moduleId");

-- One seeded page per module. Partial so the many non-default dashboards a
-- module can also have are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS "CustomAnalyticDashboard_default_per_module"
  ON board_schema."CustomAnalyticDashboard" ("organizationId", "moduleId")
  WHERE "isDefault";
