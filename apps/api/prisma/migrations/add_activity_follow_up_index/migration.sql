-- The follow-up queue reads pending activities with a due date, org-scoped and
-- ordered by that date. Activity carried "organizationId" and "dueDate" as two
-- separate indexes, so Postgres could use one and filter the rest by hand -
-- fine at a few hundred rows, a sort over the whole table at scale.
--
-- Additive: adds an index, drops nothing, so it cannot fail on existing data.

CREATE INDEX IF NOT EXISTS "Activity_organizationId_status_dueDate_idx"
  ON board_schema."Activity" ("organizationId", "status", "dueDate");
