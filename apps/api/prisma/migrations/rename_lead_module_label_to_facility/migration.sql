-- The LEAD module seeded as "Lead" but every screen calls the record a
-- facility. Only organizations still on the seeded wording are touched, so an
-- organization that renamed the module itself keeps its own label.
UPDATE board_schema."Module"
SET "labelSingular" = 'Facility'
WHERE "key" = 'LEAD' AND "isSystem" = true AND "labelSingular" = 'Lead';
