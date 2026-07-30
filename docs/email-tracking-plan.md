# Email tracking, ingest, and threading

Approved scope: open tracking (no click tracking), SES inbound ingest (no mailbox
polling, no Gmail/Outlook read scopes), thread logging on records.

## Decisions and why

- **Open tracking only.** Click tracking rewrites every outbound link through the
  API domain. Rejected for HIPAA posture and deliverability.
- **SES inbound, not mailbox polling.** `gmail.readonly` and `Mail.Read` grant the
  whole mailbox. That fails minimum-necessary and triggers Google CASA Tier 2
  assessment. SES inbound only ever receives mail deliberately sent to us.
- **Hashed IP on opens.** `sha256(ip + per-org salt)`, plus a coarse client family
  from the user agent. Enough to suppress Gmail image-proxy prefetch, not
  re-identifiable.
- **Threading via `References`, not `Message-ID`.** Gmail and SES both rewrite
  `Message-ID` on send, so we cannot know the value we sent under. Instead we
  stamp a synthetic id into `References` on outbound. RFC 5322 clients append the
  parent's `References` plus its `Message-ID` when replying, so our token survives
  in the reply. Fallback is From-address to Board EMAIL field.

## Threading match order

1. `In-Reply-To` or `References` contains `a.<trackingId>@<ingestDomain>` — exact
   activity, exact record.
2. Envelope `From` matches a `FieldValue` on an EMAIL field for a Board in the
   org that owns the ingest address.
3. No match — discard. Never persisted.

## Schema (board_schema)

`Activity` additions:

| column | type | note |
| --- | --- | --- |
| `direction` | `EmailDirection` | `OUTBOUND` default, `INBOUND` for ingested |
| `trackingId` | `String? @unique` | opaque, drives pixel URL and thread token |
| `threadToken` | `String?` | root activity's `trackingId`, groups a thread |
| `messageId` | `String?` | provider `Message-ID` when known |
| `openCount` | `Int @default(0)` | |
| `firstOpenedAt` / `lastOpenedAt` | `DateTime?` | |

New models:

- `EmailOpenEvent` — `activityId`, `occurredAt`, `ipHash`, `clientType`,
  `organizationId`.
- `EmailIngestAddress` — `organizationId @unique`, `ingestKey @unique`. Address is
  `<ingestKey>@<EMAIL_INGEST_DOMAIN>`. Lives in `board_schema` so the Better Auth
  `Organization` table is untouched and `auth:generate` is not needed.

New enum `EmailDirection { OUTBOUND, INBOUND }`.

Inbound bodies reuse the existing `Activity` encrypted columns in
`encryption-extension.ts` — no plaintext PHI added.

## API

All under `apps/api/src/api/email/`.

- `email-tracking.service.ts` — mint `trackingId`, inject pixel into rendered
  html, record opens, audit each open.
- `email-tracking.controller.ts` — `@AllowAnonymous`, `GET /api/email/o/:trackingId.gif`,
  always returns the 1x1 regardless of match so the endpoint is not an oracle.
- `email-ingest.controller.ts` — `@AllowAnonymous`, `POST /api/email/inbound/sns`.
  Verifies the SNS signature, handles `SubscriptionConfirmation`, enqueues.
- `email-ingest.processor.ts` — BullMQ worker: pull raw MIME from S3, parse,
  match, persist or discard.
- `email-ingest.service.ts` — matching and persistence.

Queue: `EMAIL_INGEST` added to `queue.constants.ts`.

Config additions: `EMAIL_INGEST_DOMAIN`, `SES_INBOUND_BUCKET`, `API_PUBLIC_URL`
(pixel host).

Send path changes in `gmail.service.ts`, `outlook.service.ts`, `board.service.ts`:
inject pixel, stamp `References`, return the provider message id where available.

## Frontend

- `components/master-list/activity-tab.tsx` — inbound vs outbound styling, open
  badge with count and last-opened time, replies nested under their parent.
- `components/integrations/integration-page.tsx` — surface the org ingest address
  with a copy control and setup text.

## Out of scope / manual

There is no `terraform/` directory in this repo, so the SES receipt rule set, the
inbound S3 bucket, and the SNS topic are provisioned manually. Steps documented in
`docs/email-ingest-setup.md`.
