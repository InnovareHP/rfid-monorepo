-- Grouping by the record on the other side of a BoardRelation, so a referral
-- chart can group by the linked facility or that facility's county.
ALTER TYPE board_schema."CustomAnalyticDimensionType" ADD VALUE IF NOT EXISTS 'RELATED_RECORD';

DO $$
BEGIN
  CREATE TYPE board_schema."CustomAnalyticRelationDirection" AS ENUM ('OUTGOING', 'INCOMING');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE board_schema."CustomAnalytic"
  ADD COLUMN IF NOT EXISTS "relationType" board_schema."RelationType",
  ADD COLUMN IF NOT EXISTS "relationDirection" board_schema."CustomAnalyticRelationDirection" NOT NULL DEFAULT 'OUTGOING',
  ADD COLUMN IF NOT EXISTS "relatedFieldId" TEXT;
