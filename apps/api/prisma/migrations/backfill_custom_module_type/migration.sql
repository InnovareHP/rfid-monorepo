-- Rows written before CUSTOM existed carry the LEAD default, which is what
-- analytics filters on. Separate migration because Postgres cannot use a new
-- enum value in the transaction that added it.
UPDATE board_schema."Field" f
SET "moduleType" = 'CUSTOM'
FROM board_schema."Module" m
WHERE f."moduleId" = m."id" AND m."isSystem" = false;

UPDATE board_schema."Board" b
SET "moduleType" = 'CUSTOM'
FROM board_schema."Module" m
WHERE b."moduleId" = m."id" AND m."isSystem" = false;

UPDATE marketing_schema."Form" fo
SET "moduleType" = 'CUSTOM'
FROM board_schema."Module" m
WHERE fo."moduleId" = m."id" AND m."isSystem" = false;

UPDATE marketing_schema."RecipientGroup" g
SET "moduleType" = 'CUSTOM'
FROM board_schema."Module" m
WHERE g."moduleId" = m."id" AND m."isSystem" = false;
