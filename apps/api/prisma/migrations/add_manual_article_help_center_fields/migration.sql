-- Help center article metadata: "Popular Articles" selection and the read time
-- shown on each category row. Existing rows default to not featured, 3 minutes.
ALTER TABLE support_schema."ManualArticle"
  ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "readMinutes" INTEGER NOT NULL DEFAULT 3;
