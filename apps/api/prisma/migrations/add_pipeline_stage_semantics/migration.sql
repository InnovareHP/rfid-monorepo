-- Adds sales pipeline semantics: stage ordering, won/lost marking, forecast probability,
-- and flags marking which Field drives the pipeline stage and deal value.
-- Additive only, existing rows keep OPEN stage and order 0.

CREATE TYPE board_schema."StageType" AS ENUM ('OPEN', 'WON', 'LOST');

ALTER TABLE board_schema."FieldOption"
  ADD COLUMN IF NOT EXISTS "optionOrder" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "stageType" board_schema."StageType" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN IF NOT EXISTS "probability" INTEGER;

ALTER TABLE board_schema."Field"
  ADD COLUMN IF NOT EXISTS "isPipelineStage" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "isPipelineAmount" BOOLEAN NOT NULL DEFAULT false;
