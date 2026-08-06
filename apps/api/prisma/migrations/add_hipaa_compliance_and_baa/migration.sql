-- HIPAA mode per organization plus the executed Business Associate Agreement.
-- hipaaEnabled is one-way in application code; nothing here enforces that.

CREATE TYPE auth_schema."AgreementKind" AS ENUM ('BAA', 'SUBSCRIPTION');
CREATE TYPE auth_schema."AcceptanceMethod" AS ENUM ('signature', 'offline');

ALTER TABLE auth_schema."Organization"
  ADD COLUMN IF NOT EXISTS "hipaaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "baaAcceptedAt" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "baaVersion" TEXT,
  ADD COLUMN IF NOT EXISTS "retentionDays" INTEGER NOT NULL DEFAULT 2555,
  ADD COLUMN IF NOT EXISTS "ipAllowlist" TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE auth_schema."ContractAgreement" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "kind" auth_schema."AgreementKind" NOT NULL DEFAULT 'BAA',
  "termsVersion" TEXT NOT NULL,
  "acceptanceMethod" auth_schema."AcceptanceMethod" NOT NULL DEFAULT 'signature',
  "companyLegalName" TEXT NOT NULL,
  "companyJurisdiction" TEXT NOT NULL,
  "companyEntityType" TEXT NOT NULL,
  "companyAddress" TEXT NOT NULL,
  "signerName" TEXT NOT NULL,
  "signerTitle" TEXT NOT NULL,
  "signerEmail" TEXT NOT NULL,
  "signerUserId" TEXT,
  "document" BYTEA,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "note" TEXT,
  "signedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ContractAgreement_pkey" PRIMARY KEY ("id")
);

-- The exact lookup the BAA gate and the settings page both perform.
CREATE INDEX "ContractAgreement_organizationId_kind_termsVersion_idx"
  ON auth_schema."ContractAgreement" ("organizationId", "kind", "termsVersion");

ALTER TABLE auth_schema."ContractAgreement"
  ADD CONSTRAINT "ContractAgreement_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES auth_schema."Organization" ("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
