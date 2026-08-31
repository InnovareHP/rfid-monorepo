-- How many groups a ranked BAR or PIE keeps. Null keeps the previous fixed ten.
ALTER TABLE board_schema."CustomAnalytic"
  ADD COLUMN IF NOT EXISTS "groupLimit" INTEGER;
