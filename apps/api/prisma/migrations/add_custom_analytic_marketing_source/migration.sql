-- Liaison outreach lives in Marketing, not on the board, so a chart over it
-- names what it counts and how it groups instead of pointing at a field.
ALTER TYPE board_schema."CustomAnalyticMetricSource" ADD VALUE IF NOT EXISTS 'MARKETING_ACTIVITY';

DO $$
BEGIN
  CREATE TYPE board_schema."CustomAnalyticMarketingMeasure" AS ENUM ('INTERACTIONS', 'FACILITIES', 'PEOPLE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE board_schema."CustomAnalyticMarketingGroupBy" AS ENUM ('LIAISON', 'FACILITY', 'TOUCHPOINT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE board_schema."CustomAnalytic"
  ADD COLUMN IF NOT EXISTS "marketingMeasure" board_schema."CustomAnalyticMarketingMeasure" NOT NULL DEFAULT 'INTERACTIONS',
  ADD COLUMN IF NOT EXISTS "marketingGroupBy" board_schema."CustomAnalyticMarketingGroupBy";
