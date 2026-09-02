-- Filters were { fieldId: value } with implicit AND equality. They become
-- { match, conditions[] } so an analytic can express an operator and OR.
-- Run once; parseFilter reads the old shape only until this has been applied.
UPDATE board_schema."CustomAnalytic"
SET "filter" = jsonb_build_object(
  'match', 'AND',
  'conditions', COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object('fieldId', pair.key, 'operator', 'eq', 'value', pair.value)
      )
      FROM jsonb_each_text("filter"::jsonb) AS pair
      WHERE pair.value <> ''
    ),
    '[]'::jsonb
  )
)
WHERE jsonb_typeof("filter"::jsonb) = 'object'
  AND NOT ("filter"::jsonb ? 'conditions');
