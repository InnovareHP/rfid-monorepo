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
