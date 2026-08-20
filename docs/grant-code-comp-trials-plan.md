# Grant codes: comp trials without payment

Plan only. Nothing in this document is implemented yet.

## Goal

An admin creates a code in fe-support. An organization enters it during
onboarding or from the plans page and gets a time-boxed trial of a plan the admin
decided, with no card and no Stripe subscription. When the trial ends access
closes and the org can pay normally.

Decisions taken: internal comp trial (not a Stripe promotion code), hard lock at
trial end plus reminder emails, redeemable at onboarding and from the plans page.

## What already exists and is reused unchanged

- `Subscription.isCustom`, `contractLabel`, `customLimits` in
  `prisma/models/stripe.prisma` already carry a non-tier entitlement.
- `resolveEntitlement()` in `packages/shared/src/lib/entitlement.ts` is the only
  thing every gate reads. No guard reads `subscription.plan` directly, so a grant
  needs no changes to any guard.
- `SubscriptionGuard` opens on `isSubscriptionActive(status)` = `active` or
  `trialing`, caches the resolved entitlement in Redis for 60s, and exposes
  `invalidateSubscriptionCache(orgId)`.
- Super admin grant path and its audit trail:
  `PATCH /api/user/admin/organizations/:orgId/entitlement` ->
  `setAdminOrganizationEntitlement()`, logged to `AdminActivityLog` with
  `AdminAction.SET_ENTITLEMENT`, UI in
  `AdminDashboard/OrganizationPage/OrganizationEntitlementDialog.tsx`.
- BullMQ job scheduler for a daily sweep:
  `lib/audit/audit-retention.processor.ts` is the shape to copy.
- `emailQueue` in `lib/queue/email-queue.ts` plus the react-email templates in
  `src/react-email/`.

A code is therefore a reusable template of the admin grant that the org applies
to itself. No new entitlement mechanism.

## Two constraints that shape the design

1. `setAdminOrganizationEntitlement` refuses when the org has no subscription
   row, on purpose: inventing a row there would fake a billing relationship
   (`user.service.ts:614`). A comp trial is exactly that row, so redemption owns
   row creation and does not call this method. The admin dialog keeps working on
   the row afterwards.
2. `Subscription.stripeCustomerId` is non-null and `@unique`, and the better auth
   stripe plugin owns the table. Redemption calls `stripe.customers.create` with
   no payment method, so the column stays honest, nothing can be charged, and a
   later real checkout reuses the customer instead of orphaning the row. Making
   the column nullable would fight the plugin.

## Schema

New models in `prisma/models/stripe.prisma`, both `@@schema("stripe_schema")`.

`GrantCode`

- `id`, `code` unique and stored uppercase, `label` (becomes `contractLabel`)
- `plan` (tier the grant maps to), `isCustom`, `customLimits Json?`
  (`{ seats, features }`) so the grant reuses `parseCustomLimits`
- `trialDays Int`
- `maxRedemptions Int?` (null = unlimited), `redeemedCount Int @default(0)`
- `expiresAt DateTime?` (code stops working), `isActive Boolean @default(true)`
- `createdByAdminId`, `createdAt`

`GrantRedemption`

- `id`, `grantCodeId`, `organizationId` unique, `redeemedByUserId`, `redeemedAt`

`organizationId` is unique so one grant per org is a database rule, not a service
check. New `AdminAction.GRANT_CODE` value in `prisma/models/auth.prisma`.

Migration runs through `pnpm prisma:migrate` — additive, no backfill.

## API

New module `apps/api/src/api/grant-code/` — module, controller, service,
`dto/grant-code.schema.ts`. Registered in `api.module.ts`.

Org-facing, `AuthGuard` + `PermissionGuard` with
`@RequirePermission({ billing: ["manage_billing"] })` so it is owner-only, org id
from the session only:

- `GET /api/grant-code/:code` — validity pre-check for the form. Returns
  `{ valid, label, trialDays }` and nothing about seats or features, so the
  endpoint cannot be used to read what a code is worth.
- `POST /api/grant-code/redeem` — body is the code only.

Redemption order matters:

1. Reject if the org already has a `Subscription` with a `stripeSubscriptionId`.
   A grant must never detach live billing.
2. Insert `GrantRedemption` first and let the unique constraint on
   `organizationId` settle concurrent requests — the same claim-first pattern as
   `WebhookEvent`. Never find-then-insert.
3. Claim a slot with `updateMany` on
   `{ id, isActive: true, redeemedCount: { lt: maxRedemptions } }` incrementing
   `redeemedCount`, and treat `count === 0` as exhausted. A read-then-write here
   oversells the code.
4. Create the Stripe customer, then the `Subscription` row: `status: "trialing"`,
   `trialStart: now`, `trialEnd: now + trialDays`, `periodEnd = trialEnd` so the
   existing `orderBy: { periodEnd: "desc" }` lookups pick it, `plan` from the
   code, `isCustom` and `customLimits` when the code is custom,
   `contractLabel: code.label`, `seats` = current member count.
5. `invalidateSubscriptionCache(orgId)`, or the grant sits invisible behind the
   guard for up to 60s and reads as a broken feature flag.
6. Audit through the existing path.

Steps 2 to 4 run in one `prisma.$transaction`, with the Stripe customer created
before the transaction opens so no network call sits inside it.

Admin, super admin only, matching the existing `admin/*` routes and audited with
`AdminAction.GRANT_CODE`:

- `POST /api/grant-code/admin` create
- `GET /api/grant-code/admin` list with `redeemedCount` and `maxRedemptions`
- `PATCH /api/grant-code/admin/:id` edit label, expiry, cap, or deactivate

Codes are never deleted, only deactivated: a redemption references the code and
the audit trail has to stay readable.

## Trial expiry

New `lib/billing/grant-expiry.processor.ts` plus service, copied from
`AuditRetentionProcessor` (`upsertJobScheduler` keyed by a scheduler id so every
boot and every replica converge on one schedule). New `QUEUE_NAMES.GRANT_EXPIRY`.

Daily it:

- flips comp rows (no `stripeSubscriptionId`) whose `trialEnd` has passed to
  `status: "canceled"`, sets `endedAt`, and clears each org's entitlement cache
- enqueues a reminder at 3 days out and at expiry

This job is the only thing that ends a comp trial. Stripe never sends a webhook
for a subscription it does not know about, so without it a grant is permanent.

Reminder email: one new template in `src/react-email/`, queued through
`emailQueue`, addressed to the org owner. Body carries the trial end date and a
link to the plans page. No PHI, no member list.

## Frontend

fe-support, `components/AdminDashboard/GrantCodePage/`:

- `GrantCodeTable.tsx` — code, label, plan or contract, trial days, redemptions
  used over cap, expiry, active
- `GrantCodeDialog.tsx` — create and edit, reusing the seats and features
  controls already in `OrganizationEntitlementDialog.tsx`
- route under the existing admin route tree with its `errorComponent` and
  `pendingComponent`
- calls added to `services/admin/admin-service.ts`, no Axios in components

fe:

- a code field in onboarding and on the plans page, both calling the same service
  function in `services/billing/`
- validate on blur through `GET /api/grant-code/:code`, redeem on submit,
  invalidate the entitlement and plan query keys on success
- the granted label already renders through `hooks/use-entitlement.ts`, so the
  plan card needs no new state

Both forms use the shadcn `Form` stack with a Zod schema and take submit state
from the mutation's `isPending`.

## Order of work

1. Schema, migration, `AdminAction.GRANT_CODE`, `pnpm prisma:generate`.
2. Grant code module: dto, service, controller, wire into `api.module.ts`.
3. Expiry processor, queue name, reminder email template.
4. fe-support admin page and service calls.
5. fe redemption field in onboarding and plans page.
6. Verify: `pnpm build:shared`, `pnpm build:api`, `pnpm lint`, browser pass on
   both flows in light and dark.

## Risks to watch

- A comp row that later converts to paid must be updated, not duplicated.
  `StripeHelper` in `lib/stripe/stripe-events.ts` needs a read before step 2 is
  written, to confirm the plugin matches on `referenceId` and updates the
  existing row rather than inserting a second one for the same org.
- `PLAN_ENTITLEMENTS` has no free tier and `resolvePlan` falls back to
  `essentials` for anything unknown. A canceled comp trial is closed by status,
  not by plan, so the fallback stays harmless — but any future gate that reads
  the plan name instead of the status would hand expired grants a paid tier.
- Seat count on a comp row is a snapshot at redemption. Nothing syncs it as
  members are added, unlike a Stripe seat subscription. Either resolve seats from
  the entitlement at check time or accept the snapshot and say so.
- `GET /api/grant-code/:code` is authenticated but still a code oracle. Worth a
  rate limit if codes are ever short or guessable.
