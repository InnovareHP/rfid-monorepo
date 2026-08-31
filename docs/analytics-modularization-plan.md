# Analytics modularization — plan

Status: proposed, nothing implemented. Approval needed before any code.

## Goal

Replace the hardcoded LEAD/REFERRAL analytics with module-scoped, user-editable
charts, so every module (system or custom) gets its own analytics defined as
data rather than as service methods.

## Where things stand

`CustomAnalytic` (`prisma/models/report.prisma:71`) is already the modular
engine: `moduleId`, `chartType`, `metricFieldId`, `metricAggregation`,
`dimensionType` (FIELD | DATE | OWNER), `dimensionFieldId`, `dateBucket`,
`columnIds`, `filter` Json, `rangeDays`. `custom-analytics.service.ts`
`computeAggregation` loads the module's records plus only the needed
FieldValues, then filters and aggregates in memory because values are encrypted
at rest.

`analytics.service.ts` is 914 lines of the opposite: `moduleType: "REFERRAL"`
literals, field names hardcoded as strings (`"Status"`, `"Payor"`, `"County"`,
`"Contact"`, `"Admission Type"`, `"Referral Source Type"`, `"Reason"`), one raw
SQL month rollup, and a Gemini summary path.

## Metric-by-metric mapping

| Legacy metric | Target | Blocked by |
| --- | --- | --- |
| `getStatusBreakdown` | PIE, dimension FIELD "Status" | option colors missing from engine output |
| `getAdmissionTypeBreakdown` | PIE, dimension FIELD | none |
| `getPayerMix` | PIE, dimension FIELD | none |
| `getReferralSourceBreakdown` | PIE, dimension FIELD | none |
| `getOutreachImpact` (raw SQL) | LINE, dimension DATE bucket MONTH | none |
| `getTotalCounts` | 4 KPI charts, COUNT with range | none |
| `getTopClinicians` | BAR, dimension FIELD "Contact" | configurable top-N |
| `getConversionRate` | KPI plus LINE | ratio aggregation |
| `getDenialTracking` | BAR by "Reason" plus LINE | `in` operator on filter |
| `getTopFacilities` | BAR over related LEAD recordName | relation-walk dimension |
| `getTopCounties` | BAR over related LEAD "County" | relation-walk dimension |
| `getEmergingSources` | BAR, groups with count < 5 | relation walk plus post-aggregation filter |
| `getReferralSourceScorecard` | TABLE with tier column | relation walk plus derived tier bucketing |
| `getAvgTimeTrend` | LINE of average days | History-sourced duration metric |
| `getAverageTimeByStatus` | BAR of average days per status | History-sourced duration metric |
| `getMarketingLeadAnalytics` | stays bespoke | reads `Marketing`, not `Board` — not a module analytic |
| `getAnalyticsByGemini` | stays bespoke | AI summary over the assembled result |

## Engine extensions needed

1. **Configurable top-N.** `computeAggregation` already hard-slices BAR and PIE
   field grouping to 10, which matches the legacy top-10 lists but silently
   truncates a breakdown with more than ten values. Needs `limit Int?` on
   `CustomAnalytic` driving that slice instead of the constant.
2. **Conditions.** `filter` becomes `{ fieldId, operator, value }[]` plus
   `match: AND | OR`. Operators: `eq`, `neq`, `in`, `contains`, `gt`, `lt`,
   `isEmpty`, `isNotEmpty`. Today it is `z.record(z.string(), z.string())` and
   the check is `row.values[fieldId] === expected`, so this is a breaking change
   to stored Json — needs a `filterVersion` column or a migration that wraps
   existing pairs as `eq` conditions.
3. **Ratio aggregation.** `metricAggregation` gains `PERCENT_OF_TOTAL`, with a
   numerator condition set, so conversion rate is expressible per bucket.
4. **Post-aggregation filter.** A `having` on group count, for emerging sources.
5. **Relation-walk dimension.** `dimensionType` gains `RELATED_RECORD` with
   `relationType` and an optional `relatedFieldId`, so a REFERRAL chart can
   group by the linked LEAD's recordName or its County. Biggest item; touches
   `computeAggregation`'s single-module load.
6. **History duration metric.** New metric source reading `History` for a
   column's `update` rows, measuring days from record creation. Separate code
   path from FieldValue aggregation.
7. **Option colors.** Return `FieldOption.color` alongside grouped data so the
   generic pie matches today's status donut.

## Dashboard and routing

- `CustomAnalyticDashboard` gains `moduleId String?` and `isDefault Boolean`.
- Per-module analytics route resolves the module's default dashboard.
- Seed default charts per system module at onboarding so nothing starts blank.
- `runDashboard` currently runs each chart independently, so an N-chart
  dashboard does N full module scans. Batch to one record load per dashboard.

## Order of work

- **A. Seed-only.** Express the 6 already-mappable metrics as `CustomAnalytic`
  rows. No engine change. Proves the path.
- **B. Extensions 1, 2, 3, 4, 7.** Unlocks clinicians, conversion, denials,
  emerging sources, and colored status charts.
- **C. Extension 5.** Relation walk. Unlocks facilities, counties, scorecard,
  and feeds the county heat map component.
- **D. Extension 6.** History duration metrics.
- **E. Retire.** Delete each legacy method only once its replacement renders.
  `getMarketingLeadAnalytics` and `getAnalyticsByGemini` stay.

## Step A outcome

Landed: dashboard `moduleId` and `isDefault` plus a hand-written migration,
`src/lib/analytics/default-analytics.ts`, seeding on onboarding and on custom
module creation, `GET /custom-analytics/dashboards/default?moduleKey=` which
lazily seeds so existing orgs backfill on first visit, and the
`records/$moduleKey/analytics` route reusing the dashboard view page.

Two parity differences against the hardcoded page, both pinned by
`custom-analytics.parity.spec.ts`:

- The legacy query counts FieldValue rows, so a record with no value for the
  field is invisible to it. The generic engine counts records, so those land in
  an `Unknown` bucket and the buckets sum to the record count. A seeded chart
  can therefore read higher than the old page.
- Field grouping truncates to ten groups; `getStatusBreakdown` returns every
  status. Resolved by the `limit` work in step B.

The migration has not been applied — that runs against the developer's database.

## Step B outcome

Landed on top of step A:

- `groupLimit` on `CustomAnalytic` drives the BAR/PIE and OWNER slice that was
  a hardcoded ten. Absent, it still means ten, so no saved chart moved.
- `filter` became `{ match, conditions[] }` with eq, neq, contains, in, gt, lt,
  isEmpty and isNotEmpty, AND or OR. Evaluation lives in
  `src/lib/analytics/analytic-filter.ts`, pure and unit tested.
- `PERCENT` aggregation with a `numeratorFilter`: the group's share of records
  that also match the numerator. A KPI with numerator `Status eq Admitted` is
  `getConversionRate`; a LINE with the same numerator is its monthly rate.
- `minGroupSize` and `maxGroupSize` drop groups by record count after
  aggregating. `maxGroupSize` is the emerging-sources shape.
- Builder UI: repeatable condition rows (reused for the numerator), a groups
  shown select, and the two group size bounds.

Bug found and fixed on the way: `ownedFieldIds` did not include the filter's
own field, so the record load never fetched it, `row.values[fieldId]` read
undefined, and a chart filtered on anything other than its metric, dimension or
table column silently returned nothing. Conditions now carry their fields into
both the ownership check and the load.

`convert_custom_analytic_filters/migration.sql` rewrites saved filters into the
condition shape. Until it runs, `parseFilter` still reads the old shape - that
is the one place that knows about it, and it can be deleted once the migration
has been applied everywhere.

## Step C outcome

- `RELATED_RECORD` dimension walks `BoardRelation` with `relationType`,
  `relationDirection` and an optional `relatedFieldId`. A referral chart groups
  by the linked lead's name (`getTopFacilities`) or by that lead's County
  (`getTopCounties`); `maxGroupSize` on the same chart is `getEmergingSources`.
  A record with no relation joins no group, matching what the hardcoded lists
  did - an unlinked referral cannot be attributed to a source.
- `relatedFieldId` lives on the module at the far end, so it is proven against
  the organization rather than against the chart's own module. The relation
  query's tenant guard is the record on the far side, because
  `BoardRelation.organizationId` is nullable.
- `computeAggregation` split into `loadRecords` and `computeFromRecords`, and
  `runDashboard` now groups charts by module and window so they share one Board
  scan. A twelve-chart dashboard ran twelve full scans, each decrypting every
  value it touched; it now runs one per distinct module and range. Each chart
  still projects only the fields it reads, so a shared load cannot leak a
  sibling chart's columns into a TABLE response.
- Builder UI: relation, direction, related module and related field controls.

Still open from this step: the county heat map is not wired to the generic
result. It needs a new chart type rather than a mapper, plus a lazy maplibre
import, and a colour and map render cannot be verified without a browser pass.

## Step D outcome

`metricSource` on `CustomAnalytic` chooses where a chart's numbers come from.
`DAYS_TO_CHANGE` measures days from record creation to each change of
`durationFieldId`, read from History `action: "update"` rows, so the rows it
aggregates are change events rather than records - a record that changed three
times contributes three of them, which is what the hardcoded metrics counted.

- LINE buckets by the date of the change: `getAvgTimeTrend`.
- BAR and PIE group by the value the field changed to:
  `getAverageTimeByStatus`, without naming a status anywhere in code.
- COUNT counts changes; AVG, SUM, MIN and MAX aggregate the day figures.
- TABLE and PERCENT are rejected: a duration has no per-record row shape and no
  numerator to read.

The chart's own `filter` still applies, because the events are loaded for the
records that survived it. `durationFieldId` is proven owned but deliberately
kept out of `ownedFieldIds`, so its current value never rides along into a
TABLE response.

## Step E status

Blocked on data, not on code. `apps/api/scripts/verify-analytics-parity.ts`
runs eleven legacy metrics and their generic replacements over the same
organization and window and prints every disagreement:

```
pnpm --filter api verify:analytics-parity <organizationId> [days]
```

It needs a reachable DATABASE_URL and nothing else - the legacy service is
instantiated off its prototype so the Redis-backed queue it never uses is not
opened. Two differences are expected and labelled in the output: the Unknown
bucket on the field breakdowns, and the top-10 cut on the ranked lists.

Nothing in `analytics.service.ts` has been deleted. Deletion waits on a clean
run against real data, because the tests prove the two paths agree on fixtures,
not that they agree on an organization's actual board.

## Module analytics section

Seeded defaults now cover every legacy metric the engine can express, and each
one is edited in place rather than being fixed in code.

- `REFERRAL` seeds thirteen charts: counts and trend, the four field
  breakdowns, conversion rate (PERCENT), both duration charts, top sources, by
  source county, emerging sources, and denial reasons.
- Charts that depend on a data value are seeded only when that value exists as
  an option on the field. An organization whose statuses are New/Won/Lost gets
  no conversion-rate chart rather than one reading 0%, and a denial chart
  narrows to whichever of Rejected and Denied that organization actually
  defines.
- Routes mirror the CRM shape: `records/$moduleKey/analytics` is the module's
  dashboard plus its chart list, `analytics/create` builds a new chart on that
  module, and `analytics/$analyticId` edits one. The global
  `analytics/custom` section is untouched and still owns cross-module
  dashboards.
- `CustomAnalyticsBuilderForm` is the one builder, used by the create page, the
  edit page and the existing dialog. The module pages lock the module select,
  since a chart reached through a module belongs to it.

## Risks

- The legacy page is what customers use today. Nothing gets deleted until the
  generic equivalent renders the same numbers side by side.
- Field names are matched by string in the legacy code. Orgs that renamed
  "Status" already get empty legacy charts; seeding by `fieldId` fixes that but
  means the seed must resolve fields per org, not per key.
- In-memory aggregation is the encryption tax. Every extension adds work inside
  that same scan, so batching (`runDashboard`) should land before C.

## To do

Step A
- [x] Seed helper that resolves a module's fields per org and creates default `CustomAnalytic` rows
- [x] Defaults for LEAD, REFERRAL, CONTACT, COMPANY
- [x] `moduleId` and `isDefault` on `CustomAnalyticDashboard` plus migration
- [x] Per-module analytics route resolving the default dashboard
- [x] Wire seeding into onboarding and custom module creation

Step B
- [x] `limit` column plus top-N in `computeAggregation`
- [x] Condition array schema, migration of existing `filter` Json, evaluation in the row filter
- [x] Condition builder UI in `custom-analytics-builder-dialog.tsx`
- [x] `PERCENT_OF_TOTAL` aggregation
- [x] `having` on group count
- [ ] Option colors in grouped output, consumed by the generic pie

Step C
- [x] `RELATED_RECORD` dimension with `relationType` and `relatedFieldId`
- [x] Related-record load path in `computeAggregation`
- [x] Batch `runDashboard` to one record load per dashboard
- [ ] Point the county heat map at the generic result

Step D
- [x] History-sourced duration metric type and its aggregation path

Step E
- [x] Side-by-side verification harness (`pnpm --filter api verify:analytics-parity <organizationId> [days]`)
- [ ] Run it against a real organization and record the result
- [ ] Delete replaced methods from `analytics.service.ts` and their controller routes
- [ ] Delete the FE chart components that no longer have a caller
