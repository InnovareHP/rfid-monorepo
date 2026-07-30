# Activity Log

## 2026-07-24 — CRM record linking (CONTACT_LINK / COMPANY_LINK)

Goal: connect leads, contacts, and companies instead of storing people as orphan PERSON blobs.

- `board.prisma`: added `CONTACT_LINK`, `COMPANY_LINK` to `BoardFieldType`.
- Migration `add_contact_company_link_field_types/migration.sql` (additive enum, apply manually).
- `board.service.ts`: `resolveLinkTarget` now field-type driven (CONTACT_LINK -> CONTACT, COMPANY_LINK -> COMPANY, REFERRAL_LINK keeps legacy moduleType/fieldName behavior). Link update/removal now scoped to the field's stored target so multiple link fields on one record no longer collide; reassigning a link deletes the stale relation.
- `onboarding.ts`: lead Medical Director / Director of Nursing / Admissions/Marketing seeded as CONTACT_LINK; contact Company field seeded as COMPANY_LINK; seeds 3 contact + 2 company records, contact email/phone values, and lead->contact CONTACT_LINK relations. Referral Patient Name stays PERSON (patients are PHI, not CRM contacts).
- FE: `editable-cell.tsx`, `filter-component.tsx` handle the new link types (target module derived from type); `create-column.tsx` offers Contact Link / Company Link.
- `prisma/scripts/person-to-contact.ts`: one-off conversion of existing LEAD PERSON data -> deduped CONTACT records + relations, flips fields to CONTACT_LINK. Handles encrypted and plaintext values. Not run automatically.

Verified: `pnpm build:api` and `pnpm build:fe` pass. Migration and conversion script not executed (user applies).

## 2026-07-24 — CRM link enhancements (id-based links, clickable, related panel)

Built on the linking work above. Four items:

1. Id-based link storage. Link `FieldValue.value` now stores the target board id, not the display name. `getAllBoards` and `getRecordById` resolve ids to names for display and expose a `linkIds` map (fieldName -> targetId) per row so the FE can navigate. `updateReferralLinkValue` resolves the incoming value as id first, falls back to name for legacy clients / CSV imports, stores the id, and keeps `BoardRelation` in sync (deletes stale relation on reassign). Bulk create (`createReferralRecords`) now resolves link values to ids and writes `BoardRelation` rows too — previously it stored raw strings and created no relation.
   - Conversion scripts: `prisma/scripts/person-to-contact.ts` now rewrites the lead PERSON field value to the new contact id; `prisma/scripts/link-values-to-ids.ts` converts any remaining name-based link values (all three link types) to ids. Run person-to-contact first, then link-values-to-ids.
2. Clickable link cells. `editable-cell.tsx` link cell now has a value-by-id `Select` plus an external-link icon that routes to the target module list (`/$team/contacts|companies|master-list`) with `?q=<name>`. Optimistic update carries a `displayValue` so the cell shows the name immediately.
3. Related records panel. New `GET /boards/:recordId/related` (`getRelatedRecords`) does a bidirectional `BoardRelation` lookup, filtered to same-org non-deleted counterparts. FE `crm-list/related-records.tsx` popover lists related records with module labels and navigation; wired into the CRM name column and the master-list detail view.
4. Dedupe warning: already existed in `crm-record-create.tsx` (uses `/boards/duplicates`) — no change needed.

FE search wiring: `master-list-page.tsx` and `crm-list-page.tsx` read `?q=` via `useSearch` into `filterMeta.search`. Create form (`record-create-page.tsx`) renders an id-based picker for CONTACT_LINK / COMPANY_LINK.

Verified: `pnpm build:api`, `pnpm build:fe`, and `tsc` on both conversion scripts all pass. No migration or script executed (user applies).

## 2026-07-28 — Sales pipeline (stages, deal value, forecast, win/loss, Kanban)

Goal: turn the existing STATUS field into a real sales pipeline without hardcoding field names the way the referral analytics does.

Schema (`board.prisma` + `prisma/migrations/add_pipeline_stage_semantics/migration.sql`, manual apply):
- New `StageType` enum (OPEN / WON / LOST) in `board_schema`.
- `FieldOption` gains `optionOrder`, `stageType`, `probability` — stage order, outcome marking, forecast weight.
- `Field` gains `isPipelineStage` / `isPipelineAmount` — marks which STATUS field drives the pipeline and which NUMBER field holds deal value, per org per moduleType. Field-id driven, so nothing breaks on rename.

API — new `apps/api/src/api/pipeline/` module (kept out of the 3k-line board.service):
- `GET /api/pipeline` — ordered stages with count, deal value sum, weighted forecast, plus open/won/lost totals, win rate and an unstaged bucket.
- `GET /api/pipeline/win-loss` — outcome derived from `History` transitions into a WON/LOST stage: counts, average cycle days from record creation, and which stage deals died in (`oldValue` of the closing transition).
- `GET /api/pipeline/config`, `PATCH /api/pipeline/config`, `PATCH /api/pipeline/stages` — config reads for any member, writes gated by `AdminRoleGuard` (owner only). All queries org-scoped.
- Aggregation is in memory: `FieldValue.value` and `History.oldValue/newValue` are encrypted at rest by the Prisma extension, so Postgres SUM/groupBy on values is not possible. `History.column` is plaintext, so filtering transitions by field name still runs in SQL.

Frontend:
- `services/pipeline/pipeline-service.ts` — typed client for the five endpoints.
- `master-list/kanban-view.tsx` — Kanban board with summary tiles (open value, weighted forecast, won, win rate). Cards fetched per stage via `useQueries` on the existing `/boards` filter, 25 per column, so no unbounded payload. Drag and drop uses native HTML5 events (no new dependency); the move reuses `updateLead`, optimistic across both column caches with rollback, then invalidates pipeline and leads.
- `master-list/pipeline-settings-dialog.tsx` — owner-only stage field / value field pick, per-stage outcome, probability, and ordering.
- `master-list-page.tsx` — Table / Pipeline toggle; filters and table only render in table view.

Known gaps: `History.column` stores the field name, so renaming the stage field orphans past win/loss history. Forecast counts only stages with an explicit probability (WON implicitly 100, LOST 0).

Verified: `pnpm build:api`, `pnpm build:fe` and `tsc --noEmit` in apps/fe all pass; eslint clean on the new API module (apps/fe has no eslint config). Migration not executed — user applies.

## 2026-07-28 — Pipeline follow-ups (History.fieldId, lead pipeline seed)

Closes the two gaps flagged in the pipeline entry above.

1. `History.fieldId` — history rows now point at the Field they changed instead of only storing its name.
   - `board.prisma`: nullable `fieldId` on `History` with a `Field?` relation (`onDelete: SetNull`), `Field.history` back-relation, `@@index([fieldId])`.
   - Migration `add_history_field_id/migration.sql` (manual apply): adds the column, backfills by joining the stored `column` name to a live field in the record's org and module, then adds the index and FK.
   - `createRecordHistory` takes an optional `fieldId`; the three field-value call sites pass `field.id`. Pseudo columns ("Assigned To", "Lead", "Name", "marketing") stay null since no field backs them.
   - `restoreRecord` selects and re-emits `fieldId`, and resolves the field by id when present, falling back to name only for pre-migration rows.
   - `pipeline.service.getWinLoss` now filters history on `fieldId`, so renaming the stage field no longer orphans win/loss history.

2. Lead pipeline bootstrap — the LEAD module had no STATUS or NUMBER field, so the Kanban had nothing to point at.
   - `onboarding.ts`: new `Pipeline Stage` (STATUS) and `Deal Value` (NUMBER) lead fields, exported `DEFAULT_LEAD_PIPELINE_STAGES` (New/Contacted/Qualified/Proposal with 10/25/50/75 probability, Won, Lost), and `configureLeadPipeline()` which seeds the stages and sets `isPipelineStage` / `isPipelineAmount`. Sample leads now get stage and deal value values (added a `NUMBER` case to the seed switch).
   - `prisma/scripts/seed-lead-pipeline.ts`: same treatment for existing orgs, skipping any org that already has a pipeline stage field. Not run automatically.

Verified: `pnpm build:api` passes, eslint clean on the touched API files, `tsc --noEmit` clean on the new script. Migration and script not executed - user applies. Note there were transient build errors in `bulk-email.processor.ts` / `ses.ts` during this work from in-flight edits outside this task; they cleared on rebuild.

Unrelated issue noticed: `restoreRecord` looks up History by id with no organization scoping, so a history id from another tenant would be accepted. Not changed here - some legacy History rows have a null `organizationId`, so adding the filter needs a data check first.

## 2026-07-28 — Email open tracking, SES inbound ingest, thread logging

Plan and rationale in `docs/email-tracking-plan.md`; AWS provisioning steps in `docs/email-ingest-setup.md`.

Scope decisions: open tracking only (no click tracking / link rewriting), SES inbound ingest instead of Gmail/Outlook mailbox polling. Polling was rejected because `gmail.readonly` and `Mail.Read` grant the whole mailbox, which fails minimum-necessary and triggers a Google CASA Tier 2 assessment. SES inbound only ever receives mail deliberately sent to us.

Schema (`board.prisma`, migration `add_email_tracking_and_ingest/migration.sql`, manual apply):
- `Activity`: `direction` (new `EmailDirection` enum), `trackingId` (unique), `threadToken`, `messageId`, `openCount`, `firstOpenedAt`, `lastOpenedAt`, plus indexes on `threadToken` and `(organizationId, messageId)`.
- `EmailOpenEvent` — one row per counted open: `ipHash`, `clientType`, org-scoped.
- `EmailIngestAddress` — per-org `ingestKey`. Kept in `board_schema` so the Better Auth `Organization` table is untouched and `auth:generate` is not needed.

Open tracking:
- `email/email-tracking.service.ts` mints the id, injects the pixel, records opens. IP is HMAC-SHA256 with `ENCRYPTION_KEY` salted per org; the user agent is reduced to a coarse client family. Opens within 10s of send are treated as provider prefetch and dropped; repeat hits from the same client inside 60s collapse into one. Every counted open writes an `email.open` audit entry.
- `email/email-tracking.controller.ts` serves `GET /api/email/o/:id.gif` anonymously and always returns the 1x1 regardless of match, so it cannot be used to confirm whether an id exists.

Threading:
- Outbound stamps a synthetic `References` id (`a.<trackingId>@<ingestDomain>`). Gmail and SES both rewrite `Message-ID` on send, so we cannot know the value we sent under; RFC 5322 clients append the parent's `References` when replying, so our token survives there instead.
- Match order on inbound: thread token in `In-Reply-To`/`References`, then sender address against an EMAIL field value, then discard. Non-matching mail is never persisted.
- Sender matching runs in app after decryption because `FieldValue.value` is encrypted at rest.

Ingest:
- `email/email-ingest.controller.ts` — anonymous `POST /api/email/inbound/sns`. Verifies the SNS signature via `lib/aws/sns-verify.ts` (no new dependency; node `crypto` plus a signing-cert host check pinned to `sns.<region>.amazonaws.com`), handles `SubscriptionConfirmation`, then enqueues.
- `email/email-ingest.processor.ts` — new `EMAIL_INGEST` queue. Pulls raw MIME from S3, parses, hands to the service.
- `email/email.controller.ts` — authenticated `GET /api/email/ingest-address`.
- Inbound activities are attributed to the record's assignee, falling back to an org owner, because `Activity.createdBy` is non-null.

Refactor done along the way: `sendEmailWithProvider` was duplicated in `board.service.ts` and `bulk-email.processor.ts`. Both now call one `board/email-dispatch.service.ts`, which renders once, injects the pixel, stamps `References`, then tries Gmail -> Outlook -> SES. `trySendViaGmail` / `trySendViaOutlook` now take rendered html instead of re-rendering internally.

New dependencies (both in apps/api): `@aws-sdk/client-s3` — SNS caps raw message delivery at 150KB so bodies must come from S3; `mailparser` — MIME parsing by hand is a bug farm.

Known gaps:
- Outlook cannot carry the thread token. Graph's `internetMessageHeaders` rejects standard headers like `References` and only accepts `x-` prefixed ones, so Outlook-sent mail threads by sender address, not by activity. Gmail and SES thread exactly.
- Inbound activities show on the record timeline but are not visually nested under their parent; `threadToken` is stored and indexed, so grouping is a UI-only change when wanted.

Verified: `pnpm build:api` passes. `pnpm build:fe` — Vite builds, `tsc` reports only the pre-existing `vite.config.ts(7,29)` duplicate-vite-version error. `pnpm --filter fe lint` clean. `pnpm --filter api lint` has 38 pre-existing repo errors; none in the files touched here (`gmail.service.ts:127` is the pre-existing `oauth2Client.on("tokens", async ...)` handler). Migration not executed — user applies.

Unrelated issue noticed: `outlook.service.ts` reads `tokens.accessToken` / `tokens.refreshToken` from the Microsoft token response, but OAuth2 returns `access_token` / `refresh_token`; `refreshAccessToken` also posts `grant_type: "refreshToken"` instead of `"refresh_token"`. Outlook connect and refresh should both be failing today. Not changed here.

## 2026-07-30 — Master List design refresh (KPI strip, toolbar, table chrome)

Goal: match the supplied Master Marketing List reference design.

Backend:
- `board.service.ts`: new `getBoardStats(organizationId, moduleType)`. Returns `{ totalFacilities, activePartners, countiesCovered }`, each `{ value, previous }`. Total = non-deleted boards for the module; previous = same count as of the first of the current month. Active partners = distinct records with an `Activity` in the trailing 30 days, previous = the 30 days before that (`ACTIVE_WINDOW_MS`). Counties = distinct non-empty `County` FieldValue values, deduped case-insensitively with a trailing " County" stripped; previous counts only records created before this month. Cached 10 min under `boards:<org>:<moduleType>:stats`, so the existing `purgeAllCacheKeys` patterns already invalidate it on mutation.
- `board.controller.ts`: `GET /api/boards/stats?moduleType=` declared above `@Get("/:recordId")` so the static path wins.
- County values are encrypted at rest; the count runs in app after the Prisma encryption extension decrypts, not in SQL.

Frontend:
- `packages/shared/src/lib/types.ts`: `BoardStatMetric`, `BoardStats`.
- `lead-service.ts`: `getLeadStats()`.
- `analytics-chart-data.ts`: `countDelta(current, previous)` — same `TrendDelta` shape as `monthOverMonthDelta`, so the existing `TrendPill` renders the +/-% This Month badge. Returns undefined when previous is 0, and the card then shows no pill.
- `master-list-stats.tsx` (new): three cards, query key `["lead-stats"]`, skeleton while loading.
- `master-list-page.tsx`: Export CSV / Smart Scan are now solid `bg-brand`; Pipeline toggle, Pipeline Settings, and Column filter kept as outline buttons; KPI strip renders in table view only; `AddRow` moved into the filter toolbar; delete mutation invalidates `["lead-stats"]` on settle.
- `master-list-filter.tsx`: normal-mode toolbar is now a flat row (no boxed primary/10 panel) — search, Filter by date, Advanced Filters (was "More Filters") on the left; ghost Refresh / Reset plus a new optional `actions` slot on the right. Shared with the referral list, which picks up the same look.
- `reusable-table.tsx`: header row is `bg-blue-50` with `text-brand` labels (was uppercase muted on gray); footer replaced the numbered pagination with the reference layout — "N of M row(s) selected.", rows-per-page select, "Page x of y", and first/prev/next/last icon buttons. `AddRow` removed from the footer.
- `column-header.tsx`: inactive sort affordance is now `ChevronsUpDown`, label styled `font-semibold text-brand`.
- `add-row.tsx`: brand-colored, label "Add Facility", dropped the unused `isReferral` prop (only the master list renders it; every other `ReusableTable` consumer passes a non-LEAD moduleType, where it already returned null).

Definitions decided with the user: KPI numbers come from a real endpoint (not derived client-side), and "Active Partners" means records with activity in the last 30 days.

Verified: `pnpm build:shared`, `pnpm build:api`, `pnpm build:fe` all pass; `npx tsc --noEmit` in `apps/fe` is clean. No lint run — `apps/fe` has no lint script and no eslint config. Not verified in a running browser (no live app session).

### Reuse pass (same day)

Follow-up on the entry above, after checking the applied page against the mock.

- `master-list-stats.tsx` deleted. It hand-rolled a Card that `analytics/charts/kpi-stat-tile.tsx` already provides (label + TrendPill + big page-title number), and that tile was already shared by `analytics-page.tsx` and `marketing-list-page.tsx`. Replaced by `master-list/board-stats-strip.tsx`, which only owns the query and the label map and renders `KpiStatTile`.
- `KpiStatTile` gained an optional `isLoading` that swaps the value for a Skeleton, so the loading state lives in the shared tile instead of each caller.
- `BoardStatsStrip` takes `moduleType` (default LEAD) and optional label overrides; service is now `getBoardStats(moduleType)` rather than a LEAD-only `getLeadStats`, and the query key is `["board-stats", moduleType]`. Referral/CRM lists can drop the same strip in with one prop. Follows the existing convention where referral-list-page imports `master-list-filter` / `master-list-view` from the master-list folder.
- Footer extracted from `reusable-table.tsx` into `reusable-table/table-pagination.tsx` (selected count, rows-per-page, page x of y, first/prev/next/last). `reusable-table.tsx` drops from ~725 to 647 lines and no longer imports the chevron icons; `PAGE_SIZES` is now defined once.

Verified: `npx tsc --noEmit` in `apps/fe` clean, `pnpm build:fe` passes. Still not exercised in a browser.

Not done, flagged for later: `reusable-table.tsx` still mixes the selection toolbar, the table, the delete dialog, and the bulk-email dialog in one file — the email dialog in particular is self-contained and would extract cleanly.

## 2026-07-30 — Create Facilities form redesign

Applied the supplied Create Facilities mock to `master-list/create`. Kept `record-create-page.tsx` generic — the layout is data, passed in by the route.

Shared component (`components/record-create/record-create-page.tsx`):
- New optional `sections?: RecordFormSection[]` prop. A section is `{ title, fields[] }`; a field is `{ name, span, required, multiline, helperText, autoFill }`. `span` maps onto a 6-column grid (full/half/third), single column on mobile. Exported `RECORD_NAME_FIELD` sentinel lets a section place the record-name input among the dynamic fields.
- Without `sections` the previous flat two-column layout renders unchanged, so the contacts, companies, and referral create pages are untouched.
- `resolveSections` appends any column the caller did not mention to the final section. Columns stay dynamic — a custom org field still shows up, it just lands in Additional Details instead of being dropped.
- `required` on a layout field drives the zod schema (`z.string().min(1)`) and the red asterisk, so required-ness is declared once.
- Cards are now single-expand: header shows "<Entity> No. N" on `bg-blue-50` in brand navy, with the record name as a Badge chip when collapsed, a red text-only Remove, and a chevron that rotates on expand. Removing a card keeps the expanded index in range.
- `multiline` renders a Textarea instead of an Input (there is no LONG_TEXT in `BoardFieldType`, so Notes is a TEXT field flagged in config).
- Footer matches the mock: full-width dashed "Add Another <Entity>", then Cancel left / brand-navy "Create <Entity>s" right.

Address auto-fill (the mock's helper text promises it, so it had to be real):
- `places.service.ts` now requests `address_components` alongside `formatted_address` and returns a parsed `components: { city, state, zipCode, county }`. Both fields are Places "Basic data", so no billing tier change. County has a trailing " County" stripped to match how `board.service.ts` stores it.
- `location-cell.tsx` gained optional `onSelectComponents` and `className` (default stays `w-96` for table cells; the form passes `w-full`).
- The component-key -> column-name mapping lives in the caller's `autoFill` config, not in the shared field renderer.

Lead-specific config: `components/master-list/facility-form-sections.ts`. Sections and field names line up with the LEAD fields seeded in `onboarding.ts` (note: the seeded names are "Zip Code" and "Fax", where the mock draws "ZIP Code" and "Fax Number" — labels come from the API, so they render as seeded).

Behavior change worth calling out: Type of Facility, Address, City, State, Zip Code, County, and Phone are now required on this form, per the asterisks in the mock. Previously only the facility name was. Remove the `required` flags in `facility-form-sections.ts` to revert. CSV import and inline table editing are unaffected.

Known gap: the pipeline Stage and Amount fields are not in the mock, so they land in Additional Details via the leftover rule.

Verified: `npx tsc --noEmit` in `apps/fe` clean; `pnpm build:fe` and `pnpm build:api` pass. Not exercised in a browser — the address auto-fill path in particular is unverified against a live Places response.

### Create form width (same day)

The centered narrow column was `max-w-5xl mx-auto` on the inner wrapper in `record-create-page.tsx`. Swapped for `w-full` and dropped page padding `p-8` -> `p-6` so the card fills the content area beside the sidebar, per the reference. Card spacing `space-y-6` -> `space-y-4` to match the tighter stack in the mock. No cap added, so on ultra-wide monitors the card tracks the viewport; add a `max-w-[1600px]` if that reads too wide.

Applies to every page using `RecordCreatePage` — contacts, companies, and referral create also go full width now.

Verified: `tsc --noEmit` clean, `pnpm build:fe` passes.

### Create form: plural label fix + responsive pass (same day)

Spelling: the submit button rendered `Create {entityLabel}s`, so Facility produced "Create Facilitys" and Company produced "Create Companys". Added a required `entityLabelPlural` prop on `RecordCreatePage` rather than a naive pluralizer, threaded it through `crm-record-create.tsx`, and set it at all four call sites (Facilities, Referrals, Contacts, Companies). Required, not optional, so a new create page cannot silently reintroduce the bug.

Responsive (`record-create-page.tsx`):
- `third` span is now `md:col-span-3 lg:col-span-2` — three inputs sharing a tablet row was too tight, so thirds become halves below lg. `half` and `full` unchanged; mobile is already single column via `grid-cols-1`.
- Page padding `p-4 sm:p-6`; card header `px-4 py-3 sm:px-6 sm:py-4`; card body `p-4 sm:p-6` with `space-y-6 sm:space-y-8`.
- Title `text-2xl sm:text-3xl`, description `text-sm sm:text-base`, back button `shrink-0`, text block `min-w-0` so a long title wraps instead of pushing the button off-screen.
- Card header: name chip truncates (`max-w-[10rem] sm:max-w-xs`), heading is `whitespace-nowrap`, action group `shrink-0` — Remove and the chevron stay reachable at narrow widths.
- Footer stacks on mobile: `flex-col-reverse` (Create above Cancel, both full width) switching to a row at sm.
- `location-cell.tsx`: the suggestions popover was a hard `w-96` (384px), which overflows a 360px viewport. Now `w-[min(24rem,calc(100vw-2rem))]`. Affects the table's inline location cell too, where it was the same latent bug.

Verified: `tsc --noEmit` clean, `pnpm build:fe` passes. Breakpoint behavior reasoned from the classes, not measured in a browser.

## 2026-07-30 — Referral list design refresh

Applied the Referral mock. No backend work needed — every number and delta already exists in the analytics response.

- `referral-list/referral-stats-strip.tsx` (new): three `KpiStatTile`s — Total Referrals, Conversion Rate, Total Denials. Values from `getAnalytics` (`totalCounts`, `conversion.conversionRate`, `denials.totalDenials`); deltas from `buildAnalyticsChartData` (`referralTrendDelta`, `conversionRateDelta`, `denialTrendDelta`). Reuses the same query key as before, `["referral-pipeline-analytics", dateFrom, dateTo]`, so the cache is shared with the analytics page. Respects the date filter: shows `referralsThisPeriod` when a range is set, `totalReferrals` otherwise.
- `KpiStatTile` now forwards `positiveDirection` to `TrendPill`. Total Denials passes `"down"`, so a drop in denials renders green — matching the mock, where -10% on denials is green while -20% on conversion is red.
- `referral-list-page.tsx`: Export CSV is brand-solid, Column filter stays as the outline control, Add Referral moved from the header into the toolbar's `actions` slot (same shape as master list). Dropped a redundant nested `space-y-6` wrapper plus a `mb-6` that double-spaced the header, and removed a stray `console.log(activeOrganizationId)`.
- `referral-analytics-strip.tsx` deleted. The mock has no inline charts, and everything it rendered already exists on the Referral Analytics page (`analytics-page.tsx`): Top 10 Referring Facilities, Referral Source Scorecard, denial reasons, Monthly Denial Trend. So this was duplicated UI, not lost capability.

Table header, row chrome, and footer came along automatically from the earlier shared `ReusableTable` changes.

Verified: `tsc --noEmit` clean, `pnpm build:fe` passes. Not exercised in a browser.

## 2026-07-30 — Create Referrals form + verification sweep

`components/referral-list/referral-form-sections.ts` (new), wired into `routes/_team/$team/referral-list/create.tsx`. Same mechanism as the facilities form — layout is config, the shared `RecordCreatePage` is untouched. Sections: Basic Information, Patient Information, Assessment, Logistics and Notes. Required per the mock: referral name, Referral Date, County, Facility, Patient Name, Date of Birth, Reason, Status. Description updated to include the "Fields marked * are required..." sentence.

Field-name reconciliation against the REFERRAL fields seeded in `onboarding.ts` — the mock's labels differ from the stored names, and labels come from the API:
- mock "Facility Name" -> seeded `Facility` (REFERRAL_LINK)
- mock "Phone" -> seeded `Number` (PHONE)
- mock "Action Date (Rejected/Accepted)" -> seeded `Action Date (Accepted / Rejected)`

Gap: the mock's Assessment section shows City, State, and ZIP Code, but no such fields are seeded for REFERRAL (only LEAD has them). The layout lists them, so they render the moment those Field rows exist; until then they are skipped and the Location auto-fill has nothing to populate. Adding them means new `Field` rows per org, which is a data change, not a frontend one.

Verification sweep of the four pages, by grep against the applied markers:
- Master List — `BoardStatsStrip`, brand-solid Export CSV / Smart Scan, `actions={<AddRow />}` in the toolbar.
- Create Facilities — `sections={FACILITY_FORM_SECTIONS}`, `entityLabelPlural="Facilities"`, trailing-period description.
- Referral — `ReferralStatsStrip`, brand-solid Export CSV, Add Referral in the toolbar `actions` slot.
- Create Referrals — `sections={REFERRAL_FORM_SECTIONS}`, `entityLabelPlural="Referrals"`.
- Shared: `reusable-table.tsx` blue header + `text-brand` labels + `TablePagination`; `master-list-filter.tsx` Advanced Filters + right-aligned actions; `record-create-page.tsx` full-width wrapper, "No. N" headers, plural submit label.

Verified: `tsc --noEmit` clean, `pnpm build:fe` passes. All four pages confirmed by code inspection only — none have been opened in a browser this session.

### Follow-up fixes found while reviewing the design work

1. County auto-fill could write an unselectable value. `applyAddressComponents` set the target field unconditionally, but County is a DROPDOWN — a geocoded county with no matching `FieldOption` left the select visually blank while the form held a value. Added `isOptionBacked` + `matchOption`, which reads the cached `["record-dropdown-options", columnId]` entry and only fills when an option matches case-insensitively. Non-option fields (City, State, Zip) fill as before.
2. Stat tiles went stale after writes. Backend already purges its Redis entry on mutation, but the frontend queries were never invalidated. Added `["board-stats"]` invalidation to the facility create route and to `editable-cell.tsx`'s update mutation (aggregates need a refetch even though the board list stays optimistic), and `["referral-pipeline-analytics"]` to the referral create route. Master-list delete already invalidated.

Verified: `tsc --noEmit` clean, `pnpm build:fe` passes.

### Frontend-only bug fixes + reusable-table cleanup

Fixes (no backend touched, per request):

1. Date range filter never worked on either list. Three names for one thing: the toolbar wrote `leadDateFrom`/`referralDateFrom`, master-list state declared `BoardDateFrom` (capital B), and the API only reads `boardDateFrom`/`boardDateTo`. Standardized all three on the API's names and dropped the isReferral branching in `DateRangeFilter` — one key pair for both modules. Reset and Refresh clear the same keys.
2. Referral advanced filters never applied. `getReferral` spread `filter` as an object, so axios sent `filter[County]=Kent` while the controller does `JSON.parse(@Query("filter"))` and got undefined. Now stringified, matching `getLeads`.
3. Referral KPI cards ignored the date range. They read `filterMeta.dateFrom`, a key nothing set. Now on `boardDateFrom`/`boardDateTo`, converted to ISO strings inside the strip so the query key stays stable.
4. Required select with no options was a silent dead end — the form blocked submission with no way to satisfy it. `record-create-page.tsx` now shows an amber hint under a required DROPDOWN/STATUS whose option list is empty.

Cleanup — `reusable-table.tsx` 725 -> 418 lines across this session:
- `bulk-email-dialog.tsx` (new): owns the email schema, the form, the gmail/outlook status queries, and the send call. The parent no longer carries `useForm`, `zodResolver`, `z`, or those two queries.
- `delete-records-dialog.tsx` (new): owns its own `isDeleting` state.
- `table-pagination.tsx` (earlier this session).
- Import block rewritten: Dialog*, Input, Label, Select*, Textarea, zodResolver, useQuery, useForm, z, SendIcon, and the three lead-service email imports all moved to the dialog files.

Behavior preserved deliberately: both dialogs still reset row selection through callbacks (`onDeleted`, `onSent`), the delete path still awaits `onDelete` before toasting, and email still resolves moduleType as `moduleType ?? (isReferral ? "REFERRAL" : "LEAD")`.

Not done, still needs a data change: referral City/State/ZIP `Field` rows, and the label mismatches (`Zip Code`/`Fax`, `Facility`/`Number`).

Verified: `tsc --noEmit` clean, `pnpm build:fe` and `pnpm build:api` pass. The four filter paths (date range on both lists, referral advanced filters, referral KPI date scoping) are code-level fixes confirmed against the controller's parameter names — none exercised against a running server.

### In-app notification system (generic core, task as first consumer)

New `notification_schema` with one `Notification` table: `type` (string machine key, no enum so features add types without a migration), `title`, `body`, `link`, `entityType`/`entityId`, `readAt`, `organizationId`, `recipientId` (Member), `actorUserId`. Manual SQL migration in `prisma/migrations/add_notification_schema/` following the marketing/booking convention. Not applied yet.

Backend `apps/api/src/api/notification/`:
- `NotificationService.notify(input)` is the entry point for any feature: takes `recipientMemberIds`, validates they belong to the org, drops the actor's own member row, bulk-inserts. Title and body are encrypted with `lib/crypto` because task names and comment bodies can carry PHI.
- Read side is member-scoped: list (paginated, `unreadOnly`), unread count, mark read, mark all read, delete one, clear read.
- Module exports the service; `TaskModule` imports it.

Task emitters (all fired after the transaction commits, never inside `$transaction`):
- `createTask` -> `task.assigned` for `assigneeMemberIds`
- `syncTaskMembers` -> `task.assigned` for newly added assignees only (tx now returns `addedAssignees`)
- `addComment` -> `task.commented` to assignees + watchers minus the author
- `completeTask` -> `task.completed` to assignees + watchers + the creator's member

Frontend: `services/notification/notification-service.ts`, `hooks/use-notifications.ts` (unread count polls every 60s, mark-read is optimistic with rollback), `components/notification/notification-bell.tsx` + `notification-item.tsx`, mounted right-aligned in the `_team.tsx` header.

Verified: `pnpm build:api` passes, `pnpm --filter fe exec tsc --noEmit` clean, api eslint clean on the new files. Nothing exercised against a running server, and the migration has not been run.

### Unified Refidly email template

`src/react-email/email-layout.tsx` rewritten as the single branded shell every template renders through: gradient accent bar (sky `#5cc3f0` -> blue `#155dfc` -> deep `#123a8a`, with a solid `background-color` fallback for Outlook), Refidly logo header, white card on `#f4f7fb`, hairline divider, and a footer carrying support link, abuse-report link, and copyright. Exports `BRAND_NAME`, a `brand` token object, and an expanded `emailStyles` set (`eyebrow`, `heading`, `paragraph`, `muted`, `link`, `buttonWrapper`, `button`, `detailBox`, `detailText`, `codeBox`, `codeText`).

Logo asset: `apps/fe/public/branding/email-logo.png`, generated from `branding/Full/Refidly [Full] - Colored 1.png` by trimming the transparent padding and flattening onto white (640x206). The layout resolves it as `EMAIL_LOGO_URL ?? ${WEBSITE_URL}/branding/email-logo.png`, so individual templates no longer take a `logoUrl` prop.

All 11 templates ported onto the shared styles: every ad-hoc local `CSSProperties` block removed, each email now leads with an eyebrow + heading, key/value blocks (invoice, booking, passkey, new device) moved into `detailBox`, and the two `process.env.APP_NAME ?? "Dashboard"` sign-offs replaced with `BRAND_NAME`. `confirmation-email.tsx` lost its Innovare HP hero image and heading; `auth-helper.ts` drops the two `emailLogoUrl` locals that fed it. `new-device-sign-in-email.tsx` now renders `settingsUrl` as a button instead of a bare URL in prose.

Verified: `pnpm build:api` passes, api eslint reports no new errors (its glob is `*.ts`, so it does not cover these `.tsx` files), and all 11 templates were rendered to HTML through `@react-email/render` against dummy config. Two render bugs found that way and fixed: react-email's default 24px `Text` line-height was clipping the 34px OTP digits, and a `{" "}` before the footer support link collapsed. Nothing sent through SES.
