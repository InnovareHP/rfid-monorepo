-- Stored S3 keys and names of files attached to an email activity, encrypted by the app.
ALTER TABLE board_schema."Activity" ADD COLUMN IF NOT EXISTS "emailAttachments" TEXT;
