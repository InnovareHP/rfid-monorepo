-- Runs after the prisma migration that creates board_schema."ModuleGroup" and
-- board_schema."Module"."groupId", and before "groupName" is dropped.
--
-- Folders used to be a free-text label on each module, so an empty folder could
-- not exist and renaming one meant retyping it on every member. Each distinct
-- name per organization becomes one ModuleGroup row, ordered by where its first
-- member sits in the sidebar, and every module that carried the name points at
-- it. Idempotent: a second run inserts nothing and re-links the same rows.

INSERT INTO board_schema."ModuleGroup" ("id", "createdAt", "updatedAt", "name", "groupOrder", "organizationId")
SELECT gen_random_uuid(),
       now(),
       now(),
       "groupName",
       MIN("moduleOrder"),
       "organizationId"
  FROM board_schema."Module"
 WHERE "groupName" IS NOT NULL
 GROUP BY "organizationId", "groupName"
ON CONFLICT ("organizationId", "name") DO NOTHING;

UPDATE board_schema."Module" AS m
   SET "groupId" = g."id"
  FROM board_schema."ModuleGroup" AS g
 WHERE g."organizationId" = m."organizationId"
   AND g."name" = m."groupName"
   AND m."groupId" IS NULL;
