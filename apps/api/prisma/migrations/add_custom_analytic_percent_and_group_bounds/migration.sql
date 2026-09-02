-- A conversion rate is a share of a group, so PERCENT reads a second filter as
-- its numerator. Group bounds drop groups by record count after aggregating.
ALTER TYPE board_schema."CustomAnalyticAggregation" ADD VALUE IF NOT EXISTS 'PERCENT';

ALTER TABLE board_schema."CustomAnalytic"
  ADD COLUMN IF NOT EXISTS "numeratorFilter" JSONB,
  ADD COLUMN IF NOT EXISTS "minGroupSize" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxGroupSize" INTEGER;
