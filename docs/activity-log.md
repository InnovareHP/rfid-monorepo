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

## 2026-08-04 — Dashboard design pass (tasks, reports, marketing, team, profile)

Mockups applied across the app, plus the backend additions the designs required. Everything below is typecheck + build verified only; nothing was exercised against a running server.

### Shared building blocks

- `packages/ui/dialog.tsx`: new `DialogFormHeader` (`#F4F9FF` band, icon circle, navy title, optional `iconClassName`) and `DialogFormFooter`. Now backs six modals: New Task, New List, Invite Member, Add County, New Campaign, New Blast.
- `packages/ui/date-picker.tsx`: `DatePicker` (Popover + Calendar, stores `yyyy-MM-dd`). Replaced the duplicate local `DateField` in the task dialog and the blast audience filter.
- `packages/ui/multi-select.tsx`: `brand` badge variant for tag/assignee pills.
- `reusable-table/status-pill.tsx`: one outline pill with `success | muted | info | danger` tones. Replaced three near-identical copies in the marketing tables and blast editor.
- `reusable-table/sortable-header.tsx`: header button with sort chevrons.
- `generic-table.tsx` / `report-table.tsx`: opt-in `tableClassName` so wide tables can set `table-fixed` + `min-w-*`; `ReportColumn.header` widened to `ReactNode`.
- `lib/fe-helpers.ts`: `downloadCSVTemplate` (header-only CSV).

### Colors

Task priority remapped (Urgent `red-900`, High `red-500`, Normal `orange-500`, Low `yellow-400`). Task status defaults set in both `onboarding.ts` and `seed-task-statuses.ts`: Backlog `#807f7f`, To Do `#a5e4f7`, In Progress `#2c86d9`, In Review `#0d3185`, Completed `#70bbff`, Cancelled `#202020`. Seed script now recolors existing rows; it was run against 4 organizations. Role badges: Owner `#0D3185`, Liaison `#2C86D9`, Admission Manager `#64D1F4`, Admin `#1B5FBF`.

### Pages

Import, History Check, County Configuration, Campaigns, Blasts, Blast editor, Team Management, Account Settings, and the referral analytics AI card (moved above the charts, switched to the mascot `AiSummaryCard`).

### Backend

- `GET /api/boards/history`: added `dateFrom`, `dateTo`, `userId`, `column` filters plus `stats` (total, last 7 days, most active editor) and `options` (users, fields) computed on the unfiltered org scope. Action filter widened to include `create`.
- `campaign.service.getCampaigns`: `_count` of forms/blasts/landingPages for the Components column.
- `blast.service.getBlasts`: `_count` of recipients for the Audience column.
- `CreateBlastSchema.campaignId` -> `z.string().nullable().optional()` so the editor's "None" option can actually clear a campaign link (the service spreads only `!== undefined`, so the old optional string could never unset it).

All additive inside the existing `organizationId` scope.

### Refactor pass

`team-page.tsx` 889 -> 339 lines (`components/team/`: role-badge, organization-card, branding-card, team-members-table, pending-invitations-table, invite-member-dialog, edit-role-dialog). `profile-page.tsx` 692 -> 135 lines (`components/profile/`: section-card, profile-tab, change-password-card, active-sessions-card, security-tab). History rows typed with `HistoryRow` / `RestoreTarget`, dropping five `any`.

### Behavior changes riding along with the design

- County: inline per-row liaison multi-select replaced by Action -> Edit Assignment in the modal; the `min(1)` liaison rule dropped so the Unassigned state the design shows is reachable.
- History: record-name column removed (not in the design); `create` rows now listed.
- Account Settings: Change Password is new (`authClient.changePassword`) — not previously on the page.
- Campaigns/Blasts: status column sorts client-side; rows-per-page control added.
- Blast editor: Campaign "None" now clears the link.
- Cancel in the invite dialog had no `type`, so it submitted the form; now `type="button"`.
- Founded date crashed with `Invalid time value` before org data loaded; guarded.

### Not verified

No runtime pass on any page. `pnpm lint` fails with 34 pre-existing `apps/api` errors (unused `Logger`, `previousValue`, `resolveRecordName` in `board.service.ts`, `require-await` in `board.controller.ts`) — all in code this work did not touch. `apps/fe` has no lint script.

### Query cost pass (same day)

Three fixes after auditing what the design work added:

- `blast.service.getAudienceCount`: only resolves full board rows when the audience filter actually needs them (a search term or field filters). With no filters — the common case when the editor first opens — it is now a `prisma.board.count` with the optional date range. Previously every editor open loaded every board in the module with all field values and filtered in memory, because the Estimated Recipients tile calls this on mount.
- History split: `getAllRecordHistory` is back to 2 queries (rows + filtered count). The org-wide stats and filter options moved to `getRecordHistoryMeta` behind `GET /api/boards/history/meta`, fetched by its own query key (`["history-report-meta", moduleType]`, 5 min `staleTime`). Paging or applying a filter no longer recomputes 5 aggregates. Restoring history invalidates both keys. KPI tiles now track the meta query's fetching state.
- `History` gained `@@index([organizationId, createdAt])` in `prisma/models/board.prisma`. Migration NOT run — `pnpm prisma:migrate` is the user's to execute.

Verified: `pnpm build:api` and `pnpm build:fe` pass, `tsc --noEmit` clean. Still no runtime pass.

## Landing page builder — Figma viewer layout (2026-08-04)

Reworked the builder to match Figma `466:2141` / `480:2712` (file `ACnvMrXDHIAY1PpnOaxqtV`), which centers a live preview viewer instead of a section list.

- New `landing-page-preview.tsx` owns the single section-type switch. `public-landing-page.tsx` now renders through it. Editor mode swaps unfilled Image and Form Embed sections for click-to-fill placeholders.
- New `preview-section-frame.tsx` wraps each previewed section: click selects, dnd-kit sortable reorders (drag activates at 8px so clicks still select).
- Builder state moved to one `useForm` seeded by RHF `values` from the query. Removed 6 `useState` mirrors, the sync `useEffect`, and the per-editor `form.watch` inside `useEffect`.
- `section-editor-panel.tsx` now registers fields on the parent form by path (`sections.<i>.props.<key>`) via `FormField`, and gained Duplicate / Delete.
- `section-type-picker.tsx` is a 2-column icon card grid. `page-settings-panel.tsx` is new (Page Name, URL Slug, SEO Title, SEO Description). `section-list-item.tsx` deleted.
- Header is now back / title / status badge / Save Draft / Publish.

Not done, needs API work: editable URL slug (no update endpoint, slug is derived from name at create), and the design's Button Label / Button URL on Text and Image sections (absent from `landing-page.schema.ts`). The list page redesign (KPI cards, search, data table, pagination) is also still outstanding.

Verified: `pnpm build:fe` passes (vite + tsc, no errors). `pnpm lint` still fails on 34 pre-existing `apps/api` errors in untouched files. No runtime pass.

### Landing pages — slug editing, section buttons, list page (same day)

Finished the items the builder rework had left blocked, then the list page.

- `landing-page.schema.ts`: Text and Image sections gained optional `ctaLabel` / `ctaHref` (same pair Hero already had). `UpdateLandingPageSchema` gained an optional `slug` constrained to lowercase-hyphen form.
- `landing-page.service.updateLandingPage`: writes `slug` when sent, rejects a taken slug with 400 both on the pre-check and on a P2002 race. Slugs are globally unique, so changing one changes the public `/l/<slug>` URL.
- FE: `TextSection` and `ImageSection` render the button; `CtaFieldPair` in the editor panel is shared by Hero, Text and Image. Page Settings slug field is now editable with the origin shown as a static prefix.
- List page rebuilt on the campaigns pattern: `KpiStatTile` x3 (Total Pages / Published / Drafts), search box, new `landing-page-list-table.tsx` on `ReportTable` with `Page | Status | Section | Created | Last Updated | Actions`, sortable Status, `TablePagination`. Delete is optimistic with rollback. Create dialog is `DialogFormHeader` + RHF/zod.
- Status pill reads "Published", not the design's "Sent" — "Sent" is blast wording and the newer Forms frame (`530:1556`) uses "Published".

Not done: the design's New Landing Page modal has a Description field, but `LandingPage` has no `description` column. Left out rather than silently writing it to `seoDescription`; adding it needs a schema change plus migration.

Verified: `pnpm build:api` and `pnpm build:fe` both pass (vite + tsc clean). `pnpm lint` still reports the same 34 pre-existing `apps/api` errors, none in touched files. No runtime pass.

## Figma email templates (2026-08-04)

Pulled all 10 `Email - *` frames from Figma (`ACnvMrXDHIAY1PpnOaxqtV`) and built them as React Email templates.

Shared shell first: `email-layout.tsx` swapped its thin accent bar for the design's gradient header (navy -> blue -> sky) with the logo left and an optional uppercase badge pill right (`badge` prop, so the 11 existing templates render unchanged apart from the new header). New `email-detail-table.tsx` holds `EmailDetailTable` (label left, value right, hairline row separators) and `EmailCta` (navy button), which every new template composes.

Templates added, copy taken verbatim from the frames: `task-assigned-email`, `task-reminder-email`, `booking-canceled-email`, `booking-reminder-email`, `booking-rescheduled-email`, `lead-assigned-email`, `trial-ending-email`, `subscription-canceled-email`, `subscription-updated-email`, `ownership-transfer-email`.

Wired to real triggers:
- Task Assigned — `task.service.emailAssignees`, called beside the existing `notifyTask` on both assignment paths (create with assignees, `setAssignees` additions).
- Subscription Updated / Canceled / Trial Ending — three new cases in `stripe-events.ts` (`customer.subscription.updated|deleted|trial_will_end`). The updated case only fires on an actual plan change, resolved by matching the price id against `PLANS`, because that event also fires on every quantity, status, and period roll.
- Booking Canceled — `booking.service.cancelOwnBooking` now emails invitee and host, mirroring the existing confirmation path (failures logged, never thrown).

Not wired, and why:
- Task Reminder, Booking Reminder — no scheduler exists. Needs a repeatable job plus decisions on lead time and dedupe.
- Booking Rescheduled — there is no reschedule endpoint; cancel is the only mutation.
- Ownership Transfer — no transfer flow exists, only a guard against removing the last owner.
- Lead Assigned — the hook exists (`board.service` ASSIGNED_TO writes) but the design's rows are facility, contact person, phone and county. Those are PHI-adjacent columns encrypted at rest, so putting them in an email is a decision for the user, not a default.

Design mapping notes: booking cancellations have no reason field in the API, and the design's Facility row maps to the booking page's location label (falling back to its title). The layout keeps the existing support and report-suspicious-activity footer links rather than the design's copyright-only footer.

Verified: `pnpm build:api` passes after each step. `pnpm lint` unchanged at the same 34 pre-existing `apps/api` errors, none in touched files. No email was actually sent and no runtime pass was done.

## Forms list — Figma Dashboard - Forms (2026-08-05)

Applied frame `530:1556` to the forms list, matching the landing pages rework.

- `form.service.getForms` now includes `_count: { select: { submissions: true } }`; `MarketingForm` on the FE gained the optional `_count`.
- `form-list-table.tsx` moved from a plain div list to `ReportTable`: `Form | Status | Submissions | Created | Last Updated | Actions`, sortable Status via `SortableHeader`, `StatusPill` for Draft/Published, submissions rendered as "N responses" with the users icon, `TablePagination` in the footer.
- `marketing-forms-list-page.tsx` gained the three KPI tiles (Total Forms / Published / Total Submissions), a search box, pagination and sort state, and optimistic delete with rollback. The create dialog moved to `DialogFormHeader` plus react-hook-form and zod; board selection resets the chosen fields, and the field list validates through `FormMessage` instead of a disabled submit.
- Row-level Publish is gone, per the design's two-icon Actions column. Publish already lives in the form builder, so it is not lost.
- Search placeholder reads "Search forms...." — the frame says "Search campaigns....", which is a copy-paste leftover from the campaigns screen.

Verified: `pnpm build:fe` and `pnpm build:api` both pass. No runtime pass.

## Help center — Figma Dashboard - Help (2026-08-09)

Applied frames `647:8223` (help landing) and `652:8835` (category detail) onto the existing manual/knowledge-base system rather than a new module.

- Schema: `ManualArticle` gained `featured` (drives "Popular Articles") and `readMinutes` (the "3 min read" line). Hand-written migration in `prisma/migrations/add_manual_article_help_center_fields/`. `seed-manual.ts` now features the first published article of each category.
- API: `GET /manual/featured`, `GET /manual/categories/published` (published-article counts), `GET /manual/categories/slug/:slug`, plus a `search` param on `GET /manual/published`. Create/update article DTOs carry `featured` and `readMinutes`.
- FE routes: `help.tsx` split into `help/index.tsx`, `help/$categorySlug/index.tsx`, `help/$categorySlug/$articleSlug.tsx`. The sidebar href `/{org}/help` is unchanged.
- FE components in `components/help/`: hero (Figma-exported mascot + background under `public/branding/`), category cards, popular articles, contact-support CTA, category table with `TablePagination`, article rows. `help-page.tsx` deleted; `manual-article-detail.tsx` kept, its raw gray palette swapped for tokens.
- Superadmin (`fe-support` /support/manual): article form gained Read time and Popular; the list shows read time, a Popular badge, and a star toggle. Category dialog gained Order, which drives card order on the help landing.
- Contact Support links to `VITE_SUPPORT_URL/en/request`.

Design mapping notes: the design's hero and CTA panels are fixed brand artwork, so they use `brand`/`brand-surface`/`brand-ink`; everything on normal surfaces uses `primary`/`foreground`/`muted-foreground` so dark mode holds. Popular topics are the first four categories by order. The category footer replaces the design's "0 of 100 row(s) selected" with an article count since these rows are not selectable.

Verified: `pnpm build:api`, `pnpm build:fe`, `pnpm --filter fe-support build` all pass; eslint clean on the touched files. Migration not applied and no browser pass.

### Help center seed refresh (2026-08-09)

`prisma/seed-manual.ts` brought up to the current system: 16 categories, 66 articles.

- Every existing article gained `readMinutes` (derived from its step count) and `featured`.
- Nine articles are featured, matching the design's Popular Articles list: Importing Leads from CSV, Creating Referrals, Setting Up Your Booking Page, How to Assign Tasks, Managing Team Members, Viewing Reports, Connecting Google Calendar and Outlook Calendar, Managing Your Subscription, Connecting Gmail and Outlook Email.
- New categories with articles for modules that postdate the original seed: Tasks & Projects (3), Marketing (3), Contacts & Companies (2), Booking (2), Notifications (1), plus passkey sign-in and HIPAA mode/BAA under Account & Security.
- "Using the Help Center" rewritten for the new hero/category/article layout. "Checking Integration Status on the Help Page" retargeted to the Integrations page, since integration health no longer lives on the help page.

Run with `pnpm --filter api prisma:seed-manual` after the migration is applied. It wipes and re-creates all manual rows and needs at least one super_admin or support user for `createdBy`.

Verified: seed file typechecks, no duplicate slugs, no per-category `order` collisions. Seed not executed.

## Page skeletons and query cache tuning (2026-08-10)

Replaced spinner-and-text loading states with skeletons shaped like the page they stand in, and stopped the cache dropping data between navigations.

Skeleton primitives, both new files:

- `components/skeletons/page-skeletons.tsx` — `PageHeaderSkeleton`, `KpiStripSkeleton`, `TableSkeleton`, `ListPageSkeleton`, `SettingsCardSkeleton`, `SettingsPageSkeleton`, `DetailPageSkeleton`, `CardGridSkeleton`, `ListRowsSkeleton`, `PublicPageSkeleton`, `FormFieldsSkeleton`, `RoutePendingSkeleton`. Mirrors `PageHeader`, `KpiStatTile` and `page-style` so nothing shifts on load.
- `components/skeletons/builder-page-skeleton.tsx` — `BuilderPageSkeleton` (top bar, canvas card, `lg:w-80` right panel) and `StepFormPageSkeleton` (blast editor's stepped form).
- `components/side-bar/sidebar-skeleton.tsx` — holds the w-16 rail and w-64 panel while the org list loads.

Wired into: blast editor, form builder, landing-page builder, public landing page, help center/category/article, pipeline settings dialog, blast group picker, related records popover, booking settings, booking list table, calendar page, record create.

Router: `defaultPendingComponent` was a full-screen overlay spinner that blanked the tree on every navigation; it is now `RoutePendingSkeleton`. `_team.tsx` had the same overlay gating on `orgLoading` while its own comment said page content renders without the org list — replaced with `SidebarSkeleton` in place of the sidebars. `components/loader.tsx` deleted; nothing else imported it.

Cache: the global client set `staleTime: 5m` but no `gcTime`, so TanStack's 5m default evicted data as soon as it went stale and every return trip refetched. Global `gcTime` is now 30m. Per-query bumps for data that rarely changes: published help content 1h (`MANUAL_STALE_TIME` in `manual-service.ts`), email ingest address 1h, counties and liaisons 30m, dropdown/status/assigned-to options and link-record lists 30m. Left short on purpose: notifications and blast send progress (polling), OAuth connection statuses, board rows, analytics and reports.

Not done: no route `loader` + `ensureQueryData`, so `defaultPreload: "intent"` still only prefetches the JS chunk, not the data.

Verified: `pnpm build:fe` passes, `tsc --noEmit` clean, eslint reports 0 errors on every touched file. The 8 rules-of-hooks errors in `reusable-table/editable-cell.tsx` are pre-existing conditional hooks; that file's diff is two `staleTime` lines. No browser pass.

### Nav rail rebuilt on tokens and variants (2026-08-10)

`primary-sidebar.tsx` was the one nav surface not on convention: a hand-rolled `<aside>` with a four-stop gradient as a `bg-[linear-gradient(...)]` arbitrary value, a `bg-[#0D3185]` tooltip override, and the same active/inactive class string written out three times (rail item, Help item, bottom bar).

- Tokens in `apps/fe/src/styles.css`: `--brand-rail-from/mid/via/to` and `--brand-rail-foreground`, mapped under `@theme inline`. Deliberately absent from `.dark` - the gradient is fixed brand artwork, and the rail previously painted `text-sidebar-primary-foreground` on it, which resolves to `#06183f` in dark and made the labels near-invisible against the dark end of the gradient.
- `.bg-brand-rail` and `.bg-brand-rail-horizontal` in `@layer utilities`. A four-stop gradient has no Tailwind color utility, so this is the one place it lives, with its stops as tokens.
- New `components/side-bar/rail-nav-item.tsx`: a `cva` component with `surface` (rail | bar) and `active` variants, consumed by the rail, the Help item, and the bottom bar. Replaces the three duplicated class strings.
- Dropped the `TOOLTIP_BRAND` hex override; the default shadcn `TooltipContent` is `bg-primary text-primary-foreground`, identical in light and correctly themed in dark.
- Labels are now solid `text-brand-rail-foreground` at every state, with hierarchy carried by the background. They were `/75` and `/70`, which is below AA for 10px text.
- Added `aria-label="Primary"` on both nav landmarks and `aria-current="page"` on the active item.
- `sidebar-skeleton.tsx`'s rail now matches: same gradient, same 3 items plus a footer slot.

Routing, active-state logic and `useNavItems`/`useIsActive` are unchanged.

Not done: the rail is a plain `<aside>`, not a shadcn `<Sidebar>`. `SidebarProvider` holds a single `state`, so a second `Sidebar` inside it would expand and collapse in lockstep with the main panel.

Verified: `pnpm build:fe` passes, `tsc --noEmit` clean, eslint 0 errors and 0 warnings across `components/side-bar` except two pre-existing ones in files not touched. Confirmed `bg-brand-rail`, `bg-brand-rail-horizontal`, `text-brand-rail-foreground`, `bg-brand-rail-foreground/20`, `ring-brand-rail-foreground/35` and `hover:bg-brand-rail-foreground/10` are all present in the emitted CSS. No browser pass, so the dark-mode fix is reasoned from the token values, not observed.

### Sidebar information architecture (2026-08-10)

`NavMain` already supported both shapes - an item with `items` renders as a `Collapsible`, one without renders as a plain link - but the data in `app-sidebar.tsx` never used the second, so three categories were collapsibles wrapping a single link, and only one group ever opened.

Tree changes:

- Direct links, promoted out of collapsibles: Master Marketing List, Referral Logs, Tasks (was Productivity), History (was Records > History Check), Import (was Import > Master Marketing List).
- CRM shrank to its remaining two entries and is now Contacts (Phonebook, Companies).
- The second `Marketing` category is now `Logs`. Two sibling categories both called Marketing, one for email and one for field logs, could not be told apart.
- Overview, Marketing Hub, Logs, Reports and Settings keep their sub-navigation.

Open state, in `nav-main.tsx`:

- `isActive: true` was hardcoded on Overview and nowhere else, so Overview always opened and every other group stayed shut even while you were inside it. Removed from the data and the type.
- A group is open when the route is inside it. Only explicit user toggles are stored: `open = openOverrides[title] ?? hasActiveChild`. Derived during render, so no effect and no state mirroring, and collapsing a group you are inside sticks rather than springing back open on the next navigation.
- Active matching moved from `subItem.url === pathname` to a `matchesPath` helper: a url owns its subtree, so Blasts stays lit on `/marketing/blasts/:id`. The org root is exact-match only, or it would light up on every page. The trailing slash in the prefix test keeps `/master-list` from matching `/master-list-analytics`.
- The collapsed icon rail's hover dropdown now marks its trigger active when a child is active; previously the collapsed sidebar gave no indication of where you were.

The Settings entry carried both `url` and `items`, and `NavMain` silently drops the url of a group. That url pointed at `/settings`, which is a layout route holding a bare `Outlet` with no index child, so it renders blank. Removed the phantom url rather than adding a nav row to an empty page. Giving `/settings` a real General page is a separate piece of work.

Verified: `pnpm build:fe` passes, `tsc --noEmit` clean, eslint 0 errors across `components/side-bar` (2 pre-existing warnings in `nav-user.tsx` and `team-switcher.tsx`, both untouched). No browser pass, so the open/active behaviour is reasoned from the routes, not clicked through.

### Third nav level (2026-08-10)

`NavMain` gained a third level, rendered as a dropdown off the sub row rather than a deeper indent. At 256px the sidebar has no room for another rail, and the parent row has to stay a link to its own page.

- `NavSubItem` gained optional `items`. A sub row with children keeps its `Link` and gains a `SidebarMenuAction` chevron that opens a `DropdownMenu` of its children, so Blasts is still one click while Groups and Senders are two.
- `subItemIsActive` marks a row active when its own url matches or any child's does, so Blasts stays lit while you are on Senders, and the parent group still auto-opens.
- The collapsed icon rail has no row to hang a nested dropdown off, so its hover menu indents the third level inside the existing one with `pl-6`. Without this, Groups, Senders and Plans were unreachable with the sidebar collapsed.

Tree: Marketing Hub is now Forms, Campaigns, Blasts (Groups, Senders), Landing Pages. Settings is Team, Counties, Booking, Compliance, Billing (Plans).

Verified: `pnpm build:fe` passes, `tsc --noEmit` clean, eslint 0 errors across `components/side-bar`. No browser pass; the chevron sits on `SidebarMenuAction`, whose `peer-*` rules target a menu-button that `SidebarMenuSubButton` does not carry, so its vertical alignment inside the 28px sub row is worth an eye.

### Collapsed sidebar menu opens on click (2026-08-10)

The collapsed icon rail's group menu was hover-only: `<DropdownMenu open={hoveredMenu === item.title}>` with pointer-enter and pointer-leave handlers and a 120ms close timer. Because `open` was controlled entirely from hover state, the trigger's own click did nothing, so the menu could not be opened by click, keyboard, or touch.

Now a plain uncontrolled `<DropdownMenu modal={false}>`. Radix handles click to toggle, Escape and outside-click to close, arrow-key navigation, and focus return. This deletes `hoveredMenu`, `closeTimerRef`, `openHoverMenu`, `closeHoverMenu` and the cleanup effect - the only `useEffect` left in the file. Hover styling on the items is unchanged; only hover-to-open went away.

Both dropdowns in the sidebar are click-driven now: this one and the third-level chevron added earlier.

Verified: `pnpm build:fe` passes, `tsc --noEmit` clean, eslint clean on `nav-main.tsx`. No browser pass.

### Nav: inline third level, CRM group back, no parent highlight (2026-08-10)

Three follow-ups after the IA pass.

- CRM restored as a group holding the four board modules, since organizations will be able to create their own. Its rows map over a `CRM_MODULES` list in `app-sidebar.tsx` so a new module is one entry, and that list becomes an API response when user-created modules land. Master Marketing List and Referral Logs came back out of the top level; Tasks stays a direct link.
- The third level now expands in place instead of opening a portalled `DropdownMenu`. A sub row with children keeps its `Link` and its `SidebarMenuAction` chevron drives a nested `Collapsible` rendering a `SidebarMenuSub` of `size="sm"` rows. Same derived-open rule as the groups, keyed `parent/child` so sub and group overrides cannot collide. The collapsed icon rail keeps its dropdown - icon-only, there is nowhere to expand into.
- Parent rows no longer show the active highlight. The group trigger dropped `isActive` entirely, and a parent sub row now lights only for its own url rather than standing in for a child. `subItemIsActive` is still what decides auto-open, so a group still expands when the route is inside it; only the highlight moved to the current page's row. The collapsed rail's trigger keeps its highlight, since nothing else there can show location.

Verified: `pnpm build:fe` passes, `tsc --noEmit` clean, eslint 0 errors across `components/side-bar`. No browser pass.

## Pipeline becomes Kanban, grouped by status (2026-08-10)

Deal Value is gone, the Kanban groups by each module's own status field, and the whole feature is renamed from pipeline to kanban across API and frontend.

Decisions taken, all confirmed except where noted:

- Full rename including the API, so `GET /api/pipeline` is now `GET /api/kanban`. Frontend and API must deploy together; a cached client calling the old path gets a 404.
- The stage field is always the module's first STATUS field by `fieldOrder`. Both marker columns are dropped, so there is nothing to configure and nothing to keep in sync. An organization that adds its own CRM module gets a working Kanban the moment the module has a status field.
- Assumed, since it was not answered: LEAD's "Pipeline Stage" field is renamed to "Status" rather than replaced, so every stage option, colour and recorded value survives. "Deal Value" is soft-deleted rather than dropped, so its `FieldValue` rows stay recoverable. Stage probabilities are kept and now drive a count-weighted forecast.

API:

- `api/pipeline/` renamed to `api/kanban/`; controller, module, service and both dto files follow. `PipelineModule` to `KanbanModule` in `api.module.ts`.
- `Field.isPipelineStage` and `Field.isPipelineAmount` removed from `prisma/models/board.prisma`, with `prisma/migrations/drop_pipeline_field_markers/migration.sql` to drop the columns.
- `kanban.service.ts`: no amount anywhere. `stage.value`, `totals.*.value` and `parseAmount` are gone; `forecast` is now `count * probability / 100` and `weightedForecast` is `open.forecast + won.count`, both counts of expected wins rather than money. `resolvePipelineFields` became `findStageField` / `resolveStageField`, reading the first STATUS field.
- `PATCH /config` and `setConfig` deleted along with `SetPipelineConfigDto`: with the field auto-derived and no amount, there was nothing left to set. `PATCH /stages` still owns order, outcome and probability.
- `onboarding.ts`: `LEAD_PIPELINE_STAGE_FIELD` and `LEAD_PIPELINE_AMOUNT_FIELD` collapse into `LEAD_STATUS_FIELD = "Status"`. The Deal Value field and its 25000/18000/32000 samples are gone from the lead seed, and `configureLeadPipeline` is now `configureLeadKanban` with no marker-setting transaction.
- `prisma/scripts/seed-lead-pipeline.ts` replaced by `seed-lead-kanban.ts`, registered as `pnpm --filter api seed:lead-kanban`. It is the data migration: renames "Pipeline Stage" to "Status", seeds default stages on any lead module lacking a STATUS field, and soft-deletes "Deal Value".

Frontend:

- `services/pipeline/pipeline-service.ts` moved to `services/kanban/kanban-service.ts`. Types renamed, `amountField`, `amountFieldId`, `amountCandidates`, `stageCandidates` and every `value` field removed, `setPipelineConfig` deleted.
- `pipeline-settings-dialog.tsx` became `kanban-settings-dialog.tsx`. Both field pickers are gone; it now names the field it groups by and edits outcome, probability and order. It also handles a module with no status field instead of rendering an empty form.
- `kanban-view.tsx`: the four currency tiles are counts now (Open, Expected wins, Won, Win rate), the per-card Deal Value line is gone, and stage headers read "N records". Its raw gray palette went to tokens while the file was being rewritten, and `SummaryTile` moved out to `kanban-summary-tile.tsx`.
- Query keys `["pipeline", ...]` and `["pipeline-cards", ...]` are now `["kanban", ...]` and `["kanban-cards", ...]`. `["referral-pipeline-analytics"]` is a different feature and was left alone.

Verified: `pnpm build:api` and `pnpm build:fe` both pass, `tsc --noEmit` clean on the frontend, eslint 0 errors on the touched files, `pnpm prisma:generate` succeeded, and a grep confirms no `isPipeline*`, `Deal Value`, `Pipeline Stage` or `/api/pipeline` references remain outside the migration script's legacy constants.

NOT run, and order matters: `pnpm --filter api seed:lead-kanban` first, then `pnpm prisma:migrate`. Running the migration first drops the columns before the rename happens, which is harmless here only because the script never reads them. No browser pass.

### Kanban tiles trimmed, referral status stages (2026-08-10)

- `kanban-view.tsx` keeps only the Open tile; Expected wins, Won and Win rate are gone. The API still computes `weightedForecast`, `totals.won`, `totals.lost` and `winRate`, and `GET /api/kanban/win-loss` still exists - nothing on the frontend reads them now.
- Referral Status options were seeded with no `stageType`, so every column defaulted to OPEN and the referral Kanban could never register a win or a loss. `statusOptionsMap` in `onboarding.ts` now carries stage metadata through a `ReferralStatusOption` type: Pending OPEN at 50%, Admitted WON, Rejected LOST, with explicit `optionOrder`.

Both LEAD and REFERRAL now seed a Status field with real Kanban stages. LEAD gets them from `seedLeadKanban`, REFERRAL inline with its field options.

Known gap, not addressed: there is no way to reach a referral Kanban in the UI. `referral-list-page.tsx` has no view toggle, and `KanbanView` fetches its cards through `getLeads`, which hardcodes `moduleType: "LEAD"` (`lead-service.ts:30`) and ignores the `moduleType` prop. Making the Kanban work for any module means routing card fetches through a module-aware service call first.

Verified: `pnpm build:api` and `pnpm build:fe` pass, `tsc --noEmit` clean, eslint 0 errors on touched files. No browser pass.

### CSV export date range (2026-08-10)

`ExportCsvButton` was a plain button calling `onExport()`. It is now a `Popover` with From and To date inputs and an Export action, so all five surfaces get the same control from one component. `onExport` takes an `ExportRange` of `{ from?, to? }`; both empty exports everything, and From after To is blocked with a message rather than silently returning nothing. The entitlement gate is unchanged.

Filtering is on the record's own created date, and where it happens differs by surface:

- Master list and referral list already page through `/api/boards` to build the export, and that endpoint already accepted `boardDateFrom` / `boardDateTo` filtering `Board.createdAt` (`board.controller.ts:85`, `board.service.ts:118`). Both now pass the range straight through, so the server does the filtering and no extra rows cross the wire.
- Marketing and mileage reports fold the range into their existing filter keys, `marketingDateFrom`/`marketingDateTo` and `mileageDateFrom`/`mileageDateTo`, so an explicit range overrides whatever the on-page filter had.
- The CRM list exports the rows already in hand rather than re-fetching, so it narrows them in memory through a new `filterByCreatedAt` in `lib/helper/helper.ts`. An inclusive "to" needs the whole of that day, so the upper bound is the following midnight. It reports "No records in that date range" instead of downloading an empty file.

`CrmRow` gained `createdAt?: string`. `getAllBoards` returns it on every flat row but the type never declared it, so the helper's generic could not accept `CrmRow[]`.

Verified: `pnpm build:fe` passes, `tsc --noEmit` clean, eslint 0 errors across the six touched files. No browser pass, and no export was actually downloaded.

Also tidied: the comment explaining why Groups and Senders are nested moved from Blasts to Campaigns, following the hand edit that reparented them.

### Referral Kanban made reachable (2026-08-10)

The referral stage data was seeded but nothing could show it. Two blockers, both fixed.

- `KanbanView` took a `moduleType` prop but fetched its cards through `getLeads`, which hardcodes `moduleType: "LEAD"` (`lead-service.ts:30`), so any module other than LEAD would have rendered lead cards under referral column headings. Added `getKanbanCards(moduleType, stageFieldId, stageName, limit)` to `kanban-service.ts` - one module-aware call that stringifies the stage filter the way `/api/boards` expects. `updateLead` already took a `moduleType`, so the drag-to-move path needed nothing.
- `onSuccess` invalidated `["leads"]` unconditionally, so moving a referral card left the referral table stale. A `LIST_QUERY_KEYS` map now picks leads / referrals / contacts / companies from the module.
- `referral-list-page.tsx` gained the table/Kanban toggle, the Kanban Settings button behind `can(role, { field: ["configure"] })`, and renders `KanbanView` with `moduleType="REFERRAL"` in place of the table. `ColumnFilter` is hidden in Kanban view, where it does nothing.

The three Kanban components moved from `components/master-list/` to `components/kanban/`, since two feature folders consume them now.

Verified: `pnpm build:fe` passes, `tsc --noEmit` clean, eslint 0 errors across `components/kanban`, `components/referral-list`, `master-list-page.tsx` and `services/kanban`. No browser pass: the drag-and-drop path and the referral board are unexercised.

### Terraform stack for AWS (2026-08-12)

There was no `terraform/` here at all - `docs/aws-uploads-and-location-infra.md`
and `docs/email-ingest-setup.md` both said so and described hand-applied
resources. Ported the fax app's stack (16 modules, ~5k lines) and adapted it to
this repo's shape, with the cost analysis from the Obsidian note
`2026-08-12-terraform-cost-and-prod-db` applied from the start rather than as a
later trim.

Shape differences from the fax app: four apps instead of four services, BullMQ
in-process in the API rather than a separate worker, socket.io on the API, an
uploads bucket with `public/` and `private/` prefixes instead of a PHI document
store, SES outbound plus optional reply ingest instead of email-to-fax, and
Bedrock plus geo-places on the task role.

- `landing` is static Astro (no SSR adapter), so it is S3 + CloudFront with an
  index-rewrite function, not a Fargate service. Removes a service, a target
  group and a log group.
- Postgres moved in-account: private RDS, no public endpoint, `rds.force_ssl`,
  and a `t4g.nano` SSM forwarder so a laptop still gets a plain connection URL
  through a localhost port-forward. `DATABASE_URL` and `REDIS_URL` are
  generated into their own Secrets Manager entries and injected from there, so
  neither is a hand-populated key.
- Levers taken as defaults: one NAT, app logs 30d against audit logs 7y, WAF
  logs to S3, Spot with an on-demand base on both frontends, Container Insights
  off. ARM64 and a Savings Plan are wired or documented but not on.
- Added `apps/api/src/api/health/` - the ALB target group needs a health path
  and the API had none.

Verified: `terraform fmt -check` clean, `terraform validate` passes,
`pnpm build:api` exits 0, eslint clean on the health module. Nothing applied
against AWS - no `terraform plan` was run, since that needs credentials and a
state bucket. The open items list in `docs/terraform-infrastructure.md` is real:
both Vite apps still ship the dev server in their production image.

## Email builder — Figma Blast Editor (2026-08-12)

Applied the new blast editor from Figma (`Refidly`, nodes `703:17585` drag and
drop, `698:16372` classic, `703:17266` review and send, `689:10505` new blast).
A blast now picks its editor at creation and keeps it.

Storage: `Blast` gained `bodyJson` and `editorType` (`BlastEditorType`, default
`DRAG_DROP`). `bodyHtml` stays the only thing the send path reads — for drag and
drop blasts the API renders it from the blocks on every write, so a client can
never compose the outgoing HTML. Migration
`blast_editor_type_and_body_json` backfills existing rows to `CLASSIC`.

- Drag and drop editor mirrors the landing page builder: dnd-kit sortable canvas,
  `Content` / `Email Settings` tabs, block types Headline, Text, Image,
  Separator, Button, each with font, size, text color, background color,
  background image, plus Duplicate and Delete.
- Classic editor keeps the numbered step cards and swaps the bare `Textarea` for
  a contentEditable toolbar (marks, alignment, lists, font, color, undo/redo,
  Substitute Variables). No editor dependency was added.
- `sanitizeRichText` and `applyMergeVariables` live in `packages/shared` so the
  builder preview and the send path agree on the allowed tag set. The send
  processor resolves `{{recordName}}`, `{{email}}` and `{{organizationName}}`
  per recipient, and the Activity row records the resolved body.
- New `POST /marketing/blasts/:id/test-send` sends the blast to one address
  without creating recipient rows or moving the status.

Verified: `pnpm build:api`, `pnpm build:fe`, `tsc --noEmit` on apps/fe all exit
0, eslint clean (0 errors) on the blast feature. No migration was applied to a
database and no email was sent — neither was run. The 8 eslint errors in
`import/referral-list-import-page.tsx` are pre-existing and untouched.

Left out: the design's footer address line (`Organization` has no address
column) and a real unsubscribe link (no unsubscribe route exists), so the footer
renders the org name and the unsubscribe line as text.

## Unsubscribe and newsletter subscribers (2026-08-13)

Closed the dead unsubscribe line left by the email builder and added the
subscriber list behind it. Consent is org-wide: one opt-out silences every
group and every module that shares the address.

Model: `EmailSubscriber` in `marketing_schema` is both the newsletter list and
the suppression list. `email` and `name` are encrypted, so matching goes
through `emailHash`, an HMAC blind index built with
`derivePurposeKey("marketing-email-index")` — the same construction as the
open-tracking ip hash, and the reason the unique key is `(organizationId,
emailHash)` rather than the ciphertext.

- The unsubscribe link carries a signed claim (`organizationId` + `emailHash` +
  HMAC), not a stored key. Mailing someone therefore creates no row, so the
  Subscribers page stays a list of real subscribers and real opt-outs instead
  of filling with every lead that was ever emailed. The address is never in the
  URL, so no inbox lands in a server log.
- Suppression is applied in `resolveForGroups`, so audience counts, group
  previews and the send all report the same number.
- `RecipientGroup.audienceType` (`BOARD` | `SUBSCRIBER`) lets a group target
  the newsletter list, so subscribers are mailable without inventing CRM rows.
  `BlastRecipient.recordId` became nullable with a `subscriberId` sibling;
  a subscriber send writes no `Activity` because there is no record timeline.
- `Form.subscribesToNewsletter` opts a public form's submitter onto the list,
  resolved from the module's `EMAIL` field. Off by default.
- Classic bodies are stored without the email shell, so `wrapClassicHtml`
  applies the footer at send time; drag and drop bodies already carry it.
  `{{unsubscribeUrl}}` resolves per recipient.
- Public routes follow the `@CrossTenant() @AllowAnonymous()` pattern with
  `@Throttle` on writes and `toPublicError`, and never 401 — the frontend's
  auth interceptor would otherwise bounce the reader to /login.

Verified: `pnpm build:api`, `pnpm build:fe`, `tsc --noEmit` on apps/fe all exit
0; eslint 0 errors on the marketing and crypto code. Not run: the migration
against a database, and no email was sent. The pre-existing unused `appConfig`
eslint error in `sender/sender.service.ts` is untouched.

Not built: double opt-in (single opt-in by design), SES bounce and complaint
suppression, and a `List-Unsubscribe` header. Custom user-defined CRM modules
were deferred — `ModuleType` is a Prisma enum wired into group resolution,
permissions, the sidebar and the route tree, so it is its own piece of work.

## Footer becomes a block; forms drop the newsletter opt-in (2026-08-13)

The unsubscribe footer was hardcoded into the rendered document, so an author
could not move or restyle it. It is now a `FOOTER` block like any other -
draggable, editable (text, unsubscribe label, colors, background), removable.
New drag and drop blasts seed with a headline and a footer.

Removing it changes the layout, never the opt-out: `renderBlastHtml` appends a
fallback footer row when no `FOOTER` block is present, and `wrapClassicHtml`
does the same for classic bodies. The builder preview mirrors that fallback, so
what the author sees matches what sends. Commercial email needs a working
unsubscribe, so this is deliberately not configurable away.

The footer can also carry a **subscribe** action, off by default: a link or a
button for whoever received the mail as a forward and is not on the list. Its
href is a `{{subscribeUrl}}` merge token resolved from the sending org, landing
on a public `/s/$token` page. The token signs only the organization id, so the
raw id never rides in a forwarded URL, and the reader types their own address
rather than the link carrying anyone else's.

Also this session:

- The newsletter opt-in was removed from marketing forms at the user's request.
  `Form.subscribesToNewsletter` / `newsletterLabel`, the submit `subscribe`
  flag, the renderer checkbox and the builder toggle are all gone; the form
  files are byte-identical to their pre-change state. Subscribers still arrive
  through the Subscribers page and the public subscribe endpoint, and
  `SubscriberSource.FORM` stays in the enum for a future signup surface.
- Subscribers added to the sidebar under Marketing Hub > Campaigns, beside
  Groups, since both are audience sources.

Verified: `pnpm build:api`, `pnpm build:fe`, `tsc --noEmit` on apps/fe exit 0;
eslint clean on the touched code apart from the pre-existing unused `appConfig`
in `sender/sender.service.ts`. No migration was applied and no email was sent.

Also wrote `docs/custom-crm-modules-plan.md`: a scoped plan for user-defined CRM
modules. Nothing built. Correction captured there — permissions are
module-agnostic (`record` / `field` resources), so they need no per-module work,
contrary to an earlier note.

## Custom CRM modules — open decisions settled (2026-08-13)

Design discussion only, no code written. The four open questions at the bottom
of `docs/custom-crm-modules-plan.md` are now answered in that doc, plus a fifth
the conversation surfaced.

- Delete allowed while `isSystem === false && recordCount === 0`, archive after.
  Count checked inside the delete transaction; `isArchived`, not `deletedAt`.
- Custom analytics are auto-derived from field types — count, created-over-time,
  group-by on the module's own `STATUS` / `DROPDOWN` fields. Lead and referral
  dashboards stay `isSystem`-only.
- No cross-module linking in v1, and `REFERRAL_LINK` is not widened. A generic
  `RECORD_LINK` is the intended successor and stays purely additive as long as
  `REFERRAL_LINK` is left alone. Checked: `BoardRelation` is source/target plus
  a `RelationType` enum, already generic enough to carry it.
- Cap 10, counting custom modules only, as one `MAX_CUSTOM_MODULES` constant in
  the module service. `EntitlementGuard` not wired on day one.
- The four current modules are seeded defaults, not clone templates. Custom
  modules start blank; sidebar renders them below a divider.

## Custom CRM modules — phase 1 built (2026-08-13)

`Module` table plus dual-write. No read path changed and `moduleType` is
untouched, so the app behaves identically. The migration has NOT been applied.

- `prisma/models/board.prisma` — new `Module` model, nullable `moduleId` on
  `Field` and `Board` with an index each. `marketing.prisma` — nullable
  `moduleId` on `RecipientGroup` and `Form`. `auth.prisma` — `modules` relation.
- `prisma/migrations/add_module_table/migration.sql` — creates the table, seeds
  the four system modules per existing org, adds the columns, backfills
  `moduleId` from `moduleType` + `organizationId`, then adds the FKs. Written to
  be re-runnable.
- Seed labels come from the current sidebar strings ("Master Marketing List",
  "Referral Logs", "Phonebook", "Companies") and lucide icon names, so the
  data-driven sidebar in phase 3 renders the same words it does now.
- FK behaviour differs on purpose: `Field` and `Board` cascade because they are
  the module's contents, `RecipientGroup` and `Form` restrict because they are
  references and should block a delete rather than vanish with it.
- `src/lib/module/system-modules.ts` — `SYSTEM_MODULES`, `seedSystemModules`,
  `resolveModuleId`. `resolveModuleId` throws rather than writing null, since a
  miss means the seed did not run.
- Dual-write added at all 12 create sites: `board.service.ts` (2 board creates,
  1 field create), `csv-import.processor.ts`, `form.service.ts`,
  `group.service.ts`, `onboarding.ts` (6, now seeding modules first).

Verified: `pnpm prisma:generate` and `pnpm build:api` exit 0, eslint clean on
the new file. The pre-existing errors in `board.service.ts` (unused `Logger`,
`previousValue`, `resolveRecordName`) and `csv-import.processor.ts`
(`no-base-to-string`, one floating promise) are untouched and unrelated.

Not done: migration not applied, no read path moved to `moduleId`, nothing
user-visible. Phase 2 is the next step.

## Custom CRM modules — phase 2 built (2026-08-13)

Read paths move to `moduleId`. The migration from phase 1 is still unapplied, so
this code must not deploy before it runs — `moduleId` is NULL until the backfill,
and every converted query would return nothing.

Decision taken this session: `moduleType` stays non-null and custom-module rows
will carry the default `LEAD`. The column is therefore knowingly wrong for custom
modules, so every read that turned a record into a module string moved onto the
`module.key` relation instead.

- `api/module/` — new `ModuleService`, `ModuleController`, `ModulesModule`,
  `GET /api/module`. Registered in `api.module.ts`. Read-only; create, archive
  and delete are phase 4.
- `apps/fe/src/services/module/module-service.ts` and `hooks/use-modules.ts`.
  `useModules()` drops archived modules by default.
- `marketing-forms-list-page.tsx` and `group-editor-dialog.tsx` fetch instead of
  a hardcoded array. Both now render `module.label`, so the pickers read
  "Master Marketing List" rather than "LEAD". Values are still module keys, so
  the wire contract is unchanged. This is the one user-visible change in phase 2.
- `board.service.ts` — 21 where clauses moved to `moduleId`, resolved once per
  method through `resolveModuleId`. Six reads that fed a module string into cache
  keys, socket events or related-record payloads now select
  `module: { select: { key: true } }` and fall back to the legacy column only
  while the backfill is incomplete. The three create sites keep both columns.
- Also converted: `kanban.service.ts` (3, `boardWhere` became async),
  `bulk-email.processor.ts` (2), `csv-import.processor.ts` (1),
  `group.service.ts` audience resolver (3), `email-ingest.service.ts` (1).
- Deliberately left on the enum: `analytics.service.ts`, `liaison.service.ts`,
  `options.service.ts` and `onboarding.ts`. These encode lead and referral
  semantics or seed the system modules by literal key, which decision 2 keeps
  `isSystem`-only.

Verified: `pnpm build:api`, `pnpm build:fe` and `tsc --noEmit` on both apps exit
0; eslint clean on every touched file. The two `board.tenant-isolation.spec.ts`
errors are pre-existing constructor-arity failures in a file this change never
touched, and `nest build` excludes specs.

Not done, on purpose:

- `hooks/use-board-sync.ts` `MODULE_QUERY_KEYS` still maps four modules to four
  query keys. Rewriting it to `["records", moduleKey]` means changing every
  consumer key at once, which is the phase 3 routing change. Until then a custom
  module's socket events would patch the leads table, so this must land before
  phase 4 ships custom modules.
- `getGroupMembers` passes `group.moduleType` rather than the group's module key.
  Correct until a group can point at a custom module, which is phase 4.
- Migration still unapplied. No read path has been exercised against real data.

### Phase 2 follow-up — checking the two deferred items (2026-08-13)

Checking them turned up a third problem that was a genuine regression, not a
deferral.

- **`updateGroup` and `updateForm` wrote `moduleType` without `moduleId`.** Once
  reads moved to `moduleId`, changing a group's or form's module through the UI
  would have saved the new value and kept resolving the old module. Both now set
  both columns. This was introduced by the phase 2 read change and would not
  have shown up until someone edited a group.
- **`getFormFields` still filtered on `form.moduleType`.** The sweep missed it
  because it reads the module off a stored row rather than a request parameter,
  so it did not match the pattern the other 21 sites shared. Now filters on
  `form.moduleId`.
- **`getGroupMembers` and `resolveForGroups`** read the group's module from the
  relation key instead of the enum column. `resolveAudience`, `resolveMembers`
  and `previewMembers` now take `moduleType: string` rather than `ModuleType`,
  since a module key is free text once organizations create their own.
- **`use-board-sync.ts`** keeps its four-entry map, but an unknown module now
  falls through to `["records", moduleType]` rather than `"leads"`. A module the
  map does not cover misses a live patch instead of writing another module's
  rows into the leads table. The full rewrite still belongs to phase 3.

Verified: `pnpm build:api` and `tsc --noEmit` on both apps exit 0. eslint clean
on the changed files; `use-board-sync.ts` keeps 24 pre-existing `any` warnings
that this change did not touch.

## Custom CRM modules — phase 3 built (2026-08-13)

Routing and the sidebar stop being written out module by module.

- `lib/helper/board-query-key.ts` — `boardQueryKey(moduleKey)` returns
  `["records", moduleKey]`. This replaced **five** separate module-to-name maps
  (`use-board-sync`, `kanban-view`, `board-module-service`,
  `history-report-page`, plus four ad-hoc `isReferral ? "referrals" : "leads"`
  ternaries in `column-header`, `create-column`, `editable-cell` and
  `activity-tab`). Every one of them had to be edited by hand for a new module.
  Roughly 25 call sites moved across 13 files.
- `CrmModuleType` widened from `"CONTACT" | "COMPANY"` to `string`, and
  `create-column`'s `queryKey` prop from `string` to `string[]`.
- `lib/helper/module-route.ts` — `modulePath(key)`. The four seeded modules keep
  their shipped paths so no saved link breaks; anything else resolves to
  `records/<key>`.
- `routes/_team/$team/records/$moduleKey/{index,create}.tsx`, both with an
  `errorComponent`. They render `ModuleListRoute` / `ModuleCreateRoute` from
  `components/crm-list/module-list-route.tsx`, which owns the module lookup and
  the not-found branch so it is not written twice in `routes/`.
- `app-sidebar.tsx` — the CRM group maps over `useModules()` instead of a static
  array. Icons are stored as lucide names and resolved through `MODULE_ICONS`,
  falling back to `Table2` rather than rendering nothing.

Verified: `pnpm build:fe` exits 0 (`tsc` then `vite build`), eslint clean on the
touched files apart from pre-existing warnings.

Gotcha worth remembering: `apps/fe`'s build script is `tsc && vite build`, so a
newly added route file fails typecheck until `vite build` has run once to
regenerate `routeTree.gen.ts`. Run `pnpm exec vite build` first when adding
routes.

Not done:

- `/records/$moduleKey/$recordId`. The plan lists it, but no generic record
  detail component exists — contacts and companies have no detail route either,
  only list and create. Building one is new functionality rather than a route
  rewrite, so it belongs with phase 4 or its own change.
- The sidebar does not yet split custom modules below a divider (decision 5).
  Nothing renders there until modules can be created, so it lands with phase 4.

## Custom CRM modules — phase 4, create path (2026-08-14)

The wizard, reached from "New Module" as the last item in the sidebar CRM group.

- `POST /api/module` behind `field: ["configure"]`, so owner and admission
  manager can shape the schema and liason cannot. `MAX_CUSTOM_MODULES = 10` is a
  single exported constant checked in one place, counting `isSystem: false` rows
  only. Key is derived server-side with `toSlug`, uppercased, underscored, and
  rejected if it collides with an existing module in the org.
- Module and its fields are created in one nested write, so a module never
  exists without columns.
- `components/module-setup/` — three-step wizard (Name it, Columns, Review) on
  one react-hook-form, with `step` the only `useState`. Templates are fixed
  People / Organizations / Custom field sets, never a copy of another module.
- The derived key is shown on step 1 as the future `/records/<KEY>` address,
  with a note that it cannot be changed. The preview calls the same `toSlug`
  from `@dashboard/shared` the server uses, so the two cannot drift.
- `lib/helper/module-icons.ts` — icon name to component in one place, shared by
  the wizard picker and the sidebar.

Verified: `pnpm build:api` and `pnpm build:fe` exit 0, eslint clean on the new
files.

Still missing from phase 4: archive, rename, reorder, delete-when-empty and the
module management screen. Creation works end to end; nothing can be removed yet
except by hand.

### Module wizard — choices, icons and a real preview (2026-08-14)

The first cut created DROPDOWN and STATUS columns with no options, which is a
broken column rather than an empty one: the picker has nothing to pick, and
Kanban groups by the first STATUS field, so the module would also open a board
with no columns.

- `CreateModuleSchema` fields carry `options: string[]`, capped at 20. The
  service creates `FieldOption` rows for select types only, reusing the existing
  `isSelectType` helper rather than testing the type inline.
- The wizard shows a Choices input on DROPDOWN and STATUS rows, and step 2
  refuses to advance while a select column has none.
- The People and Organizations templates ship real status choices
  (New/Active/Inactive, Prospect/Active/Inactive), matching what onboarding
  seeds for the system modules.
- Icon picker renders the icon rather than the string that names it.
- Review renders the table the module will produce — the name column plus every
  field as a header, with a sample row — instead of a list of column names.
- Templates are `as const`, so `templateFields()` copies them into mutable rows
  before the field array takes them.

Verified: `pnpm build:api` and `pnpm build:fe` exit 0, eslint clean.

### Calendar restyled from Figma (2026-08-14)

Applied the Refidly Figma calendar frames (`Calendar - Monthly` 711:3223,
`Calendar - Week` 718:6186, `Calendar - Day` 720:6579) to the calendar page.

- Page header is now `PageHeader` (title plus provider legend and a
  `Badge variant="success"` Connected chip) with a flat primary New Event
  button, replacing the hand-rolled icon box and gradient buttons.
- `calendar-toolbar.tsx` owns what FullCalendar's own toolbar used to render:
  outlined prev/next icon buttons, centered period title, and a Month/Week/Day
  segmented control. `headerToolbar={false}`; title and active view mirror the
  calendar API through `datesSet`.
- The segmented control class string moved out of `integration-page.tsx` into
  `components/segmented-tabs.tsx`, now used by both screens.
- Day headers render through `dayHeaderContent`: uppercase brand weekday, plus
  a m/d line in week view and the full weekday name in day view.
- `styles.css` `.fc` block rewritten to the design: `--table-header` header row,
  hairline `--border` rules, flat cells, `--calendar-weekend` and
  `--calendar-today` tints, out-of-month on `--muted`, solid 6px event pills.
  Provider colors are now `--google` and `--outlook` tokens, so the Google red
  and Outlook blue live in one place instead of three.
- All the gradients, alternating row tints, white-on-primary column headers and
  pill-shaped day numbers are gone.

Verified: `pnpm build:fe` and `tsc --noEmit` exit 0; eslint on the touched files
reports no new problems. Not rendered in a browser — the page needs a connected
Google or Outlook calendar to reach its populated state.

### Task detail restyled from Figma (2026-08-14)

Applied the `Task Expanded` frame (708:2566) to the task detail screen. Styling
and layout only — every mutation, query and handler is unchanged.

- Header is a square outline back button next to `PageHeader` with the
  `Task #N` title, and Duplicate / Archive / Delete as equal outline buttons.
  Delete lost its raw red classes; the confirm dialog still carries the
  destructive variant.
- First card: tinted `bg-table-header` band holding the complete checkbox and
  the task name, then a padded body. Field labels are the shadcn `Label` with
  `RequiredMark` on Status, Priority and Assignee/s, replacing the uppercase
  gray captions. Priority options now show their dot from `PRIORITY_CONFIG`,
  matching what Status already did.
- Second card: the tab bar uses the shared `SegmentedTabs*` (added with the
  calendar work), so Details/Comments/Activity match the design's pill.
- `task-section.tsx` (new) gives every section its heading plus a rule. The five
  section components use it and the `<Separator />` rows between them are gone.
  Add rows are now a leading checkbox, a full-width field, and the add control.
- Section internals moved off raw gray/red/amber palette classes onto tokens, so
  the screen holds up in dark mode. `Loader2` spinners replaced by `Spinner`.
- `LabelPicker` chips carry an x to remove a label, and its trigger reads
  "Add Tag" per the design.

Corrections after reading the frame's design context rather than its screenshot:
the task name uses the display font at semibold, the Status and Priority swatches
are rounded squares rather than dots, Assign and Add Tag carry a dashed border as
add-affordances, and label chips are full-radius pills. Label chips keep their
per-label color from the API instead of the frame's single light blue, since the
design does not model per-label colors.

Deviations from the frame, both deliberate:
- Add rows keep a trailing `+` button where the design draws an x. An x-only row
  leaves no mouse path to add an item.
- Dates stay native `type="date"` inputs rather than the design's formatted
  "August 1, 2026" picker, which would need a new component.

Verified: `pnpm build:fe` and `tsc --noEmit` exit 0. eslint on the touched files
reports one carried-over warning (`text-white` on the API-colored subtask status
pill, same as `task-row.tsx`). Not rendered in a browser.

## Plan claims made real — custom reporting (2026-08-14)

The Growth and Scale cards advertised three things the product did not do. The
feature vocabulary was ai / export / priority_support / hipaa, and the report
pages were gated by role, so an Essentials org saw exactly what a Scale org saw.

Decision taken: gate only new features. Existing analytics pages stay open to
every plan, so no current customer loses anything at deploy.

- `advanced_analytics` (growth and up) and `custom_reporting` (scale) added to
  `PLAN_ENTITLEMENTS` and `PLAN_FEATURE_LABELS`. Both now render on the plans
  page from the entitlement table, so the two duplicate strings came out of
  `PLAN_COPY.extras`.
- `SavedReport` model plus `add_saved_report/migration.sql`. A report stores
  `rangeDays`, not dates, so "last 90 days" keeps meaning that rather than
  freezing to the window it was built in.
- `api/report/` — CRUD plus `GET /:id/run`, the whole controller behind
  `@RequireFeature("custom_reporting")`. Filtering runs in the app layer because
  `FieldValue.value` is encrypted at rest, so SQL equality would match
  ciphertext.
- `components/custom-report/` — saved report list, builder dialog (module,
  columns, range, one optional equals filter) and the run view with CSV export.
  Route `/report/custom`, sidebar entry hidden unless entitled rather than
  leading to a refusal the plan cannot act on.
- `lib/monthly-report/` — `upsertJobScheduler` on `10 7 1 * *` following
  `audit-retention.processor.ts`. Sends owners a per-module added/total summary.
  Counts only: no record names or field values leave the org, so the email
  carries nothing that would be PHI.

Verified: `pnpm build:api`, `pnpm build:fe` and `tsc --noEmit` on both apps exit
0; eslint clean on every new file.

Not verified: neither migration has been applied, so no report has been saved or
run, and the monthly job has never fired. The cron only registers on boot, so
the first real check is that the scheduler appears in Redis after an API start.

### Optimistic deletes (2026-08-14)

`apps/fe` had 132 mutations, 90 without `onMutate`, so the convention in
`frontend-conventions.md` was aspirational. Rather than convert all 90, this
covers the class where it changes what a user sees: removing a row from a list
that is already on screen.

- `custom-report-page.tsx` — `deleteReport`. The run view belongs to the row, so
  it closes with it and comes back if the delete fails.
- `marketing-blasts-list-page.tsx` and `marketing-senders-page.tsx` — plain
  arrays, same shape as the delete already in `marketing-forms-list-page.tsx`.
- `expense-log.tsx` and `market-log.tsx` — the cache is `{ data, total }` keyed
  with `filterMeta`, so these use `setQueriesData` across the prefix and adjust
  `total`. Rollback restores every page entry captured by `getQueriesData`.

Creates were deliberately left alone: `createReport` and `createModule` both
leave the surface on success, so an optimistic insert would need a placeholder
id that the refetch immediately replaces.

Still without optimistic handling, and untouched here: `integration-page.tsx`
(ten connect/disconnect mutations), `lead-option.tsx`, booking cancellation, and
the publish/verify toggles across marketing. These are pre-existing.

Verified: `pnpm build:fe` exits 0, eslint clean on the five touched files.

### advanced_analytics is now enforced (2026-08-14)

The feature was added to the entitlement table but gated nothing: it rendered on
the Growth and Scale cards as "Advanced analytics & reporting" and granted
nothing. Same defect this work set out to fix.

This reverses the earlier "only gate new features" decision at the user's
request. **Essentials organizations lose the analytics pages they use today**,
so it needs a release note.

- `analytics.controller.ts` carries `@RequireFeature("advanced_analytics")` at
  class level. `@Get("summary")` keeps its method-level `ai` requirement, which
  overrides the class one; Growth holds both, so nothing regresses.
- Sidebar hides both Overview analytics entries when unentitled.
- `components/feature-locked.tsx` — a shared lock panel with the reason and a
  link to plans. Used by `analytics-page.tsx` and `marketing-list-page.tsx`.

The lock screen was not optional here: `/$team/` renders the analytics dashboard,
so it is the page an organization lands on after login. Gating the API alone
would have dropped every Essentials user onto a failed request at sign-in. The
queries are also disabled when unentitled, so no 403 is fired to render it.

Both lock returns sit after every hook; eslint react-hooks/rules-of-hooks is
clean on both files.

Verified: `pnpm build:api` and `pnpm build:fe` exit 0, eslint clean.
