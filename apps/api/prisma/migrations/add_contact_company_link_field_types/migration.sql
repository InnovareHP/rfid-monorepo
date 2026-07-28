-- Adds CONTACT_LINK and COMPANY_LINK board field types for CRM record linking.
-- Additive enum change only, no table or data changes.

ALTER TYPE board_schema."BoardFieldType" ADD VALUE IF NOT EXISTS 'CONTACT_LINK';
ALTER TYPE board_schema."BoardFieldType" ADD VALUE IF NOT EXISTS 'COMPANY_LINK';
