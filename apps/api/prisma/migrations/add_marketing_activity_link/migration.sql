-- An activity mirrored from a liaison marketing log now points back at that log,
-- so editing or deleting the log keeps the record's activity feed in sync.
ALTER TABLE board_schema."Activity"
  ADD COLUMN IF NOT EXISTS "marketingId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Activity_marketingId_key"
  ON board_schema."Activity" ("marketingId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Activity_marketingId_fkey'
  ) THEN
    ALTER TABLE board_schema."Activity"
      ADD CONSTRAINT "Activity_marketingId_fkey"
      FOREIGN KEY ("marketingId") REFERENCES liason_schema."Marketing"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
