-- Adds CONTACT and COMPANY board modules and their relation link types.
-- Additive enum change only, no table or data changes.

ALTER TYPE board_schema."ModuleType" ADD VALUE IF NOT EXISTS 'CONTACT';
ALTER TYPE board_schema."ModuleType" ADD VALUE IF NOT EXISTS 'COMPANY';
ALTER TYPE board_schema."RelationType" ADD VALUE IF NOT EXISTS 'CONTACT_LINK';
ALTER TYPE board_schema."RelationType" ADD VALUE IF NOT EXISTS 'COMPANY_LINK';
