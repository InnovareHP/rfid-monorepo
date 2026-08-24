-- AlterTable
ALTER TABLE "liason_schema"."Marketing" ADD COLUMN "facilityRecordId" TEXT;

-- CreateIndex
CREATE INDEX "Marketing_facilityRecordId_idx" ON "liason_schema"."Marketing"("facilityRecordId");

-- AddForeignKey
ALTER TABLE "liason_schema"."Marketing" ADD CONSTRAINT "Marketing_facilityRecordId_fkey" FOREIGN KEY ("facilityRecordId") REFERENCES "board_schema"."Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;
