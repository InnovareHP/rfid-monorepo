-- Files attached to every email a blast sends.
ALTER TABLE marketing_schema."Blast" ADD COLUMN IF NOT EXISTS "attachments" JSONB;
