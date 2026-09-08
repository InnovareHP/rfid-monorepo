-- Runs after add_module_group_name, which added the column.
--
-- Every organization seeded before groups existed carries its four built-in
-- modules ungrouped, so their sidebars would show the new folders only for
-- modules created from here on. This files the built-ins the way
-- SYSTEM_MODULES now seeds them: the two boards you work through under
-- Pipeline, the two lists of who you work with under Directory.
--
-- Only rows that were never grouped are touched, so an organization that
-- already filed a built-in somewhere keeps its own choice. groupName is a
-- display label, so the worst case of a wrong guess is a folder someone
-- renames or empties on the Modules settings page.

UPDATE board_schema."Module"
   SET "groupName" = 'Pipeline'
 WHERE "isSystem" = true
   AND "groupName" IS NULL
   AND "key" IN ('LEAD', 'REFERRAL');

UPDATE board_schema."Module"
   SET "groupName" = 'Directory'
 WHERE "isSystem" = true
   AND "groupName" IS NULL
   AND "key" IN ('CONTACT', 'COMPANY');
