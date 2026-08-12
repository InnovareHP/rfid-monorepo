-- The new email builder authors a block list instead of raw HTML. Blocks live
-- in bodyJson and bodyHtml is rendered from them, so existing blasts stay
-- readable by defaulting to the classic editor.

DO $$
BEGIN
  CREATE TYPE marketing_schema."BlastEditorType" AS ENUM ('DRAG_DROP', 'CLASSIC');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE marketing_schema."Blast"
  ADD COLUMN IF NOT EXISTS "bodyJson" JSONB,
  ADD COLUMN IF NOT EXISTS "editorType" marketing_schema."BlastEditorType" NOT NULL DEFAULT 'DRAG_DROP';

UPDATE marketing_schema."Blast" SET "editorType" = 'CLASSIC' WHERE "bodyJson" IS NULL;
