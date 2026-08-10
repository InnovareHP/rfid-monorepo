-- The Kanban now groups by each module's first STATUS field, so the marker
-- columns that pointed at a stage field and a deal value field are gone.
--
-- Run "pnpm --filter api seed:lead-kanban" BEFORE this migration. That script
-- renames "Pipeline Stage" to "Status", seeds default stages on any lead module
-- without a STATUS field, and soft-deletes "Deal Value". It reads
-- isPipelineStage nowhere, but it is the step that keeps existing boards
-- grouped by the same field they were grouped by before.
--
-- Deal Value itself is not dropped here: the seed script marks it isDeleted, so
-- its FieldValue rows survive and the field can be restored.
ALTER TABLE board_schema."Field"
  DROP COLUMN IF EXISTS "isPipelineStage",
  DROP COLUMN IF EXISTS "isPipelineAmount";
