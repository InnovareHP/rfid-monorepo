-- AdminAction gains the two entries the superadmin sign-in link writes: one
-- when the link is minted, one when it is redeemed. Both rows name the admin
-- who issued it, so a redemption is attributable even though the customer is
-- the one who opened the URL.
--
-- Additive only: no existing row changes and nothing is removed.
--
-- ADD VALUE IF NOT EXISTS is transaction-safe on PostgreSQL 12+.

ALTER TYPE auth_schema."AdminAction" ADD VALUE IF NOT EXISTS 'CREATE_SIGN_IN_LINK';
ALTER TYPE auth_schema."AdminAction" ADD VALUE IF NOT EXISTS 'USE_SIGN_IN_LINK';
