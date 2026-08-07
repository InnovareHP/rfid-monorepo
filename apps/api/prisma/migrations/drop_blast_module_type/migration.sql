-- A blast no longer has a module of its own. Each group it sends to carries
-- one, and the send unions groups across modules, so the column on the blast
-- could only contradict them.

ALTER TABLE marketing_schema."Blast" DROP COLUMN IF EXISTS "moduleType";
