-- CreateEnum
CREATE TYPE "board_schema"."CustomAnalyticChartType" AS ENUM ('BAR', 'LINE', 'PIE', 'KPI', 'TABLE');

-- CreateEnum
CREATE TYPE "board_schema"."CustomAnalyticAggregation" AS ENUM ('SUM', 'AVG', 'COUNT', 'MIN', 'MAX');

-- CreateEnum
CREATE TYPE "board_schema"."CustomAnalyticDimensionType" AS ENUM ('FIELD', 'OWNER', 'DATE');

-- CreateEnum
CREATE TYPE "board_schema"."CustomAnalyticDateBucket" AS ENUM ('DAY', 'WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "board_schema"."CustomAnalytic" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "chartType" "board_schema"."CustomAnalyticChartType" NOT NULL,
    "metricFieldId" TEXT,
    "metricAggregation" "board_schema"."CustomAnalyticAggregation" NOT NULL DEFAULT 'COUNT',
    "dimensionType" "board_schema"."CustomAnalyticDimensionType" NOT NULL DEFAULT 'FIELD',
    "dimensionFieldId" TEXT,
    "dateBucket" "board_schema"."CustomAnalyticDateBucket",
    "columnIds" TEXT[],
    "filter" JSONB NOT NULL,
    "rangeDays" INTEGER,
    "moduleId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "CustomAnalytic_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomAnalytic_organizationId_moduleId_idx" ON "board_schema"."CustomAnalytic"("organizationId", "moduleId");

-- AddForeignKey
ALTER TABLE "board_schema"."CustomAnalytic" ADD CONSTRAINT "CustomAnalytic_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "board_schema"."Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."CustomAnalytic" ADD CONSTRAINT "CustomAnalytic_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."CustomAnalytic" ADD CONSTRAINT "CustomAnalytic_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
