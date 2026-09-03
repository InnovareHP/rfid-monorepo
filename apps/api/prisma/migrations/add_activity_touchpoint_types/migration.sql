-- ActivityType gains the channels TouchpointType already had. Before this,
-- TEXT, LINKED_IN, FACEBOOK and OTHER touchpoints all mirrored onto the board
-- as NOTE, so a liaison's LinkedIn touch read as a note and mirrored back as
-- OTHER. The channel was destroyed on the round trip.
--
-- Additive only: no existing row changes, and nothing is removed. EMAIL_BLAST
-- is deliberately not added -- a blast is raised by the marketing feature and
-- is never logged by hand, so it keeps folding into EMAIL.
--
-- ADD VALUE IF NOT EXISTS is transaction-safe on PostgreSQL 12+, which is what
-- the ALTER TYPE below relies on.

ALTER TYPE board_schema."ActivityType" ADD VALUE IF NOT EXISTS 'TEXT';
ALTER TYPE board_schema."ActivityType" ADD VALUE IF NOT EXISTS 'LINKED_IN';
ALTER TYPE board_schema."ActivityType" ADD VALUE IF NOT EXISTS 'FACEBOOK';
ALTER TYPE board_schema."ActivityType" ADD VALUE IF NOT EXISTS 'OTHER';
