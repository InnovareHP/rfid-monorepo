-- Time-to-change metrics read History rather than FieldValue, so the chart
-- names the field whose changes it measures.
DO $$
BEGIN
  CREATE TYPE board_schema."CustomAnalyticMetricSource" AS ENUM ('FIELD_VALUE', 'DAYS_TO_CHANGE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE board_schema."CustomAnalytic"
  ADD COLUMN IF NOT EXISTS "metricSource" board_schema."CustomAnalyticMetricSource" NOT NULL DEFAULT 'FIELD_VALUE',
  ADD COLUMN IF NOT EXISTS "durationFieldId" TEXT;
