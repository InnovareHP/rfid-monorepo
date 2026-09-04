-- A status change writes three rows: the status itself, its reason, and its
-- action date. Nothing linked them, so the timeline showed the status write and
-- lost the other two. One id per user action groups them.
ALTER TABLE board_schema."History"
  ADD COLUMN IF NOT EXISTS "groupId" TEXT;

CREATE INDEX IF NOT EXISTS "History_groupId_idx"
  ON board_schema."History" ("groupId");
