-- BlastRecipient and FormSubmission carried no organizationId, so the tenant
-- extension could not scope them: SCOPED_MODELS is derived from that column.
-- Both rows are reachable only through a parent today, which is safe by habit
-- rather than by construction.
--
-- Added nullable, backfilled from the parent, then set NOT NULL, so an existing
-- table is never rejected mid-migration for holding rows without the column.

ALTER TABLE marketing_schema."BlastRecipient"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

UPDATE marketing_schema."BlastRecipient" r
  SET "organizationId" = b."organizationId"
  FROM marketing_schema."Blast" b
  WHERE r."blastId" = b."id"
    AND r."organizationId" IS NULL;

-- A recipient whose blast vanished cannot be attributed to an organization and
-- would block the NOT NULL below. It is orphaned either way.
DELETE FROM marketing_schema."BlastRecipient"
  WHERE "organizationId" IS NULL;

ALTER TABLE marketing_schema."BlastRecipient"
  ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "BlastRecipient_organizationId_idx"
  ON marketing_schema."BlastRecipient" ("organizationId");

ALTER TABLE marketing_schema."BlastRecipient"
  DROP CONSTRAINT IF EXISTS "BlastRecipient_organizationId_fkey",
  ADD CONSTRAINT "BlastRecipient_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES auth_schema."Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE marketing_schema."FormSubmission"
  ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

UPDATE marketing_schema."FormSubmission" s
  SET "organizationId" = f."organizationId"
  FROM marketing_schema."Form" f
  WHERE s."formId" = f."id"
    AND s."organizationId" IS NULL;

DELETE FROM marketing_schema."FormSubmission"
  WHERE "organizationId" IS NULL;

ALTER TABLE marketing_schema."FormSubmission"
  ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "FormSubmission_organizationId_idx"
  ON marketing_schema."FormSubmission" ("organizationId");

ALTER TABLE marketing_schema."FormSubmission"
  DROP CONSTRAINT IF EXISTS "FormSubmission_organizationId_fkey",
  ADD CONSTRAINT "FormSubmission_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES auth_schema."Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
