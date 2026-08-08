-- Managed subdomains are gone: an organization sends from a domain it controls.
-- Postgres cannot drop a value from an enum, so the type is rebuilt. Any row
-- still on the old kind becomes CUSTOM_DOMAIN rather than being deleted, so no
-- verified sender stops working mid-campaign.
UPDATE marketing_schema."SenderIdentity"
  SET kind = 'CUSTOM_DOMAIN'
  WHERE kind = 'MANAGED_DOMAIN';

ALTER TYPE marketing_schema."SenderKind" RENAME TO "SenderKind_old";

CREATE TYPE marketing_schema."SenderKind" AS ENUM ('PERSONAL', 'CUSTOM_DOMAIN');

ALTER TABLE marketing_schema."SenderIdentity"
  ALTER COLUMN kind TYPE marketing_schema."SenderKind"
  USING kind::text::marketing_schema."SenderKind";

DROP TYPE marketing_schema."SenderKind_old";
