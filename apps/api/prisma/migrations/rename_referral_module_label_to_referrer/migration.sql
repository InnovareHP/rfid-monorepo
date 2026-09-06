-- The REFERRAL module seeded as "Referral" but every screen calls the record a
-- referrer. Only organizations still on the seeded wording are touched, so an
-- organization that renamed the module itself keeps its own label.
UPDATE board_schema."Module"
SET "labelSingular" = 'Referrer'
WHERE "key" = 'REFERRAL' AND "isSystem" = true AND "labelSingular" = 'Referral';
