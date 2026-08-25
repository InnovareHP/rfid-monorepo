-- CreateTable
CREATE TABLE "board_schema"."CustomAnalyticDashboard" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "CustomAnalyticDashboard_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "board_schema"."CustomAnalytic" ADD COLUMN "dashboardId" TEXT;

-- CreateIndex
CREATE INDEX "CustomAnalyticDashboard_organizationId_idx" ON "board_schema"."CustomAnalyticDashboard"("organizationId");

-- CreateIndex
CREATE INDEX "CustomAnalytic_organizationId_dashboardId_idx" ON "board_schema"."CustomAnalytic"("organizationId", "dashboardId");

-- AddForeignKey
ALTER TABLE "board_schema"."CustomAnalyticDashboard" ADD CONSTRAINT "CustomAnalyticDashboard_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "auth_schema"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."CustomAnalyticDashboard" ADD CONSTRAINT "CustomAnalyticDashboard_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "auth_schema"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."CustomAnalytic" ADD CONSTRAINT "CustomAnalytic_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "board_schema"."CustomAnalyticDashboard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
