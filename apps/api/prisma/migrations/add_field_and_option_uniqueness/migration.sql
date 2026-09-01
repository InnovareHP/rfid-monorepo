-- Seeding and imports pass skipDuplicates, which only skips rows that violate a
-- unique index. Field and FieldOption had none, so the flag did nothing and a
-- repeated seed duplicated every column and every dropdown option.
--
-- Both indexes are partial on isDeleted: a soft-deleted field or option must not
-- block re-creating one with the same name. Prisma cannot express a partial
-- unique index, so these stay hand-written and are absent from schema.prisma.
--
-- These will fail if duplicates already exist. Find them first:
--
--   SELECT "organizationId", COALESCE("moduleId", '') AS m, "fieldName", COUNT(*)
--   FROM board_schema."Field" WHERE "isDeleted" = false
--   GROUP BY 1, 2, 3 HAVING COUNT(*) > 1;
--
--   SELECT "fieldId", "optionName", COUNT(*)
--   FROM board_schema."FieldOption" WHERE "isDeleted" = false
--   GROUP BY 1, 2 HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Field_org_module_name_active_key"
  ON board_schema."Field" ("organizationId", (COALESCE("moduleId", '')), "fieldName")
  WHERE "isDeleted" = false;

CREATE UNIQUE INDEX IF NOT EXISTS "FieldOption_field_name_active_key"
  ON board_schema."FieldOption" ("fieldId", "optionName")
  WHERE "isDeleted" = false;
