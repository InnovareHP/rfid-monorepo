-- Backfill organizationId on board_schema child tables after the
-- denormalization migration (FieldValue, History, FieldOption, BoardRelation).
-- Run ONCE after `prisma migrate` has added the nullable columns.
-- New rows are populated by the application; this fills pre-existing rows.

BEGIN;

UPDATE board_schema."FieldValue" fv
SET "organizationId" = b."organizationId"
FROM board_schema."Board" b
WHERE fv."recordId" = b."id"
  AND fv."organizationId" IS NULL;

UPDATE board_schema."History" h
SET "organizationId" = b."organizationId"
FROM board_schema."Board" b
WHERE h."recordId" = b."id"
  AND h."organizationId" IS NULL;

UPDATE board_schema."FieldOption" fo
SET "organizationId" = f."organizationId"
FROM board_schema."Field" f
WHERE fo."fieldId" = f."id"
  AND fo."organizationId" IS NULL;

UPDATE board_schema."BoardRelation" br
SET "organizationId" = b."organizationId"
FROM board_schema."Board" b
WHERE br."sourceId" = b."id"
  AND br."organizationId" IS NULL;

COMMIT;
