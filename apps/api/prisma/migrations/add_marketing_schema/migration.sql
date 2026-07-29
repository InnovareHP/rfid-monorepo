-- Adds the marketing schema: campaigns, email blasts, forms, and landing
-- pages for lead/referral generation. Additive only, new schema and tables.

CREATE SCHEMA IF NOT EXISTS marketing_schema;

CREATE TYPE marketing_schema."CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
CREATE TYPE marketing_schema."BlastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT', 'FAILED');
CREATE TYPE marketing_schema."PageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE IF NOT EXISTS marketing_schema."Campaign" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" marketing_schema."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "organizationId" TEXT NOT NULL,
  "createdBy" TEXT,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES auth_schema."Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Campaign_createdBy_fkey" FOREIGN KEY ("createdBy")
    REFERENCES auth_schema."User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Campaign_organizationId_status_idx"
  ON marketing_schema."Campaign" ("organizationId", "status");

CREATE TABLE IF NOT EXISTS marketing_schema."Blast" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "bodyHtml" TEXT NOT NULL,
  "status" marketing_schema."BlastStatus" NOT NULL DEFAULT 'DRAFT',
  "moduleType" board_schema."ModuleType" NOT NULL DEFAULT 'LEAD',
  "audienceFilter" JSONB NOT NULL,
  "scheduledAt" TIMESTAMPTZ(3),
  "sentAt" TIMESTAMPTZ(3),
  "organizationId" TEXT NOT NULL,
  "campaignId" TEXT,
  "createdBy" TEXT,
  CONSTRAINT "Blast_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Blast_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES auth_schema."Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Blast_campaignId_fkey" FOREIGN KEY ("campaignId")
    REFERENCES marketing_schema."Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Blast_createdBy_fkey" FOREIGN KEY ("createdBy")
    REFERENCES auth_schema."User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Blast_organizationId_status_idx"
  ON marketing_schema."Blast" ("organizationId", "status");

CREATE TABLE IF NOT EXISTS marketing_schema."BlastRecipient" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "trackingId" TEXT,
  "openCount" INTEGER NOT NULL DEFAULT 0,
  "firstOpenedAt" TIMESTAMPTZ(3),
  "lastOpenedAt" TIMESTAMPTZ(3),
  "sentAt" TIMESTAMPTZ(3),
  "error" TEXT,
  "blastId" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  CONSTRAINT "BlastRecipient_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BlastRecipient_blastId_fkey" FOREIGN KEY ("blastId")
    REFERENCES marketing_schema."Blast" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BlastRecipient_recordId_fkey" FOREIGN KEY ("recordId")
    REFERENCES board_schema."Board" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "BlastRecipient_trackingId_key"
  ON marketing_schema."BlastRecipient" ("trackingId");
CREATE UNIQUE INDEX IF NOT EXISTS "BlastRecipient_blastId_recordId_key"
  ON marketing_schema."BlastRecipient" ("blastId", "recordId");

CREATE TABLE IF NOT EXISTS marketing_schema."Form" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" marketing_schema."PageStatus" NOT NULL DEFAULT 'DRAFT',
  "moduleType" board_schema."ModuleType" NOT NULL DEFAULT 'LEAD',
  "fieldMappings" JSONB NOT NULL,
  "submitButtonText" TEXT NOT NULL DEFAULT 'Submit',
  "redirectUrl" TEXT,
  "organizationId" TEXT NOT NULL,
  "campaignId" TEXT,
  "createdBy" TEXT,
  CONSTRAINT "Form_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Form_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES auth_schema."Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Form_campaignId_fkey" FOREIGN KEY ("campaignId")
    REFERENCES marketing_schema."Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Form_createdBy_fkey" FOREIGN KEY ("createdBy")
    REFERENCES auth_schema."User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Form_slug_key" ON marketing_schema."Form" ("slug");
CREATE INDEX IF NOT EXISTS "Form_organizationId_status_idx"
  ON marketing_schema."Form" ("organizationId", "status");

CREATE TABLE IF NOT EXISTS marketing_schema."FormSubmission" (
  "id" TEXT NOT NULL,
  "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceIp" TEXT,
  "userAgent" TEXT,
  "formId" TEXT NOT NULL,
  "recordId" TEXT NOT NULL,
  CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId")
    REFERENCES marketing_schema."Form" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "FormSubmission_recordId_fkey" FOREIGN KEY ("recordId")
    REFERENCES board_schema."Board" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "FormSubmission_formId_idx" ON marketing_schema."FormSubmission" ("formId");

CREATE TABLE IF NOT EXISTS marketing_schema."LandingPage" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" marketing_schema."PageStatus" NOT NULL DEFAULT 'DRAFT',
  "sections" JSONB NOT NULL,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "publishedAt" TIMESTAMPTZ(3),
  "organizationId" TEXT NOT NULL,
  "campaignId" TEXT,
  "formId" TEXT,
  "createdBy" TEXT,
  CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LandingPage_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES auth_schema."Organization" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "LandingPage_campaignId_fkey" FOREIGN KEY ("campaignId")
    REFERENCES marketing_schema."Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LandingPage_formId_fkey" FOREIGN KEY ("formId")
    REFERENCES marketing_schema."Form" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "LandingPage_createdBy_fkey" FOREIGN KEY ("createdBy")
    REFERENCES auth_schema."User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LandingPage_slug_key" ON marketing_schema."LandingPage" ("slug");
CREATE INDEX IF NOT EXISTS "LandingPage_organizationId_status_idx"
  ON marketing_schema."LandingPage" ("organizationId", "status");
