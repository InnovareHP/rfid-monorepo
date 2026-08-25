-- AlterTable
ALTER TABLE "board_schema"."CustomAnalytic" ADD COLUMN "dashboardOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing dashboard members with a deterministic 0-based order.
-- Today's order is unspecified (no orderBy anywhere), so creation order is the
-- only non-arbitrary choice available.
UPDATE "board_schema"."CustomAnalytic" AS c
SET "dashboardOrder" = ordered.rn - 1
FROM (
  SELECT "id",
         row_number() OVER (
           PARTITION BY "dashboardId"
           ORDER BY "createdAt" ASC, "id" ASC
         ) AS rn
  FROM "board_schema"."CustomAnalytic"
  WHERE "dashboardId" IS NOT NULL
) AS ordered
WHERE c."id" = ordered."id";

-- DropIndex
DROP INDEX "board_schema"."CustomAnalytic_organizationId_dashboardId_idx";

-- CreateIndex
CREATE INDEX "CustomAnalytic_organizationId_dashboardId_dashboardOrder_idx"
  ON "board_schema"."CustomAnalytic"("organizationId", "dashboardId", "dashboardOrder");
