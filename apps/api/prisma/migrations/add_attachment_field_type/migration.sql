-- AlterEnum
ALTER TYPE "board_schema"."BoardFieldType" ADD VALUE 'ATTACHMENT';

-- CreateTable
CREATE TABLE "board_schema"."FieldValueAttachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "fieldValueId" TEXT NOT NULL,

    CONSTRAINT "FieldValueAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldValueAttachment_fieldValueId_idx" ON "board_schema"."FieldValueAttachment"("fieldValueId");

-- CreateIndex
CREATE INDEX "FieldValueAttachment_organizationId_idx" ON "board_schema"."FieldValueAttachment"("organizationId");

-- AddForeignKey
ALTER TABLE "board_schema"."FieldValueAttachment" ADD CONSTRAINT "FieldValueAttachment_fieldValueId_fkey" FOREIGN KEY ("fieldValueId") REFERENCES "board_schema"."FieldValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "board_schema"."FieldValueAttachment" ADD CONSTRAINT "FieldValueAttachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "auth_schema"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
