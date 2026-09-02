-- A chart now carries the width of its dashboard tile, so a seeded page can
-- reproduce a hand-built layout instead of a uniform half-width grid.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CustomAnalyticTileSpan') THEN
    CREATE TYPE board_schema."CustomAnalyticTileSpan" AS ENUM ('THIRD', 'HALF', 'TWO_THIRDS', 'FULL');
  END IF;
END
$$;

ALTER TABLE board_schema."CustomAnalytic"
  ADD COLUMN IF NOT EXISTS "tileSpan" board_schema."CustomAnalyticTileSpan" NOT NULL DEFAULT 'HALF';

-- A county density map is a grouped chart with its own rendering.
ALTER TYPE board_schema."CustomAnalyticChartType" ADD VALUE IF NOT EXISTS 'MAP';
