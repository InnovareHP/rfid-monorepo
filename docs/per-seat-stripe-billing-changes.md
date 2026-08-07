# Per-seat Stripe billing

Ported from the fax app's Stripe design (Obsidian vault:
`wiki/concepts/stripe-billing-setup.md`), adapted to per-seat pricing. The fax
app's page-quota metering, top-ups, fax-number purchase, overage invoicing, and
sales-led custom contracts were deliberately left out — this product has no
metered unit, it has members.

## The finding that shaped the work

`@better-auth/stripe@1.6.25` already implements per-seat billing natively. Given
a plan with `seatPriceId` and an organization customer, it:

- counts organization members and puts a seat line item on the subscription at
  `quantity = memberCount`
- re-syncs that quantity on every member add or remove, via organization hooks it
  injects (composed with, not replacing, the repo's existing hooks), with
  `proration_behavior: "create_prorations"`
- writes `seats` back to the local subscription row

So per-seat is a configuration problem, not a hand-rolled one. Nothing bespoke
was written to drive seat quantity.

## Billing is org-level now

The vault is explicit that the Stripe customer belongs to the organization,
never to a user. This repo previously had `createCustomerOnSignUp: true` with
`stripeCustomerId` on `User`, while subscriptions were already keyed by
`referenceId` = organizationId.

- `Organization.stripeCustomerId` added (unique). The plugin creates the org
  customer on demand at upgrade time.
- `createCustomerOnSignUp` turned off — with passkey-only signup and org-level
  billing there is nothing for a per-user customer to do.
- `organization: { enabled: true }` added to the plugin.
- `User.stripeCustomerId` is left in place; existing rows are untouched.

## Bugs removed from the old webhook handler

`lib/helper.ts`'s `StripeHelper` was a second writer on the row the plugin
already writes, and it was wrong in four ways:

1. `payment_intent.succeeded` read a PaymentIntent as if it were a Subscription
   — `payment.items.data[0].quantity`, `payment.period_start`,
   `payment.cancel_at_period_end` do not exist on a PaymentIntent — and wrote a
   PaymentIntent status ("succeeded") into `subscription.status`.
2. `customer.subscription.created` hardcoded `plan: "dashboard"` regardless of
   the price actually purchased.
3. `periodStart` was set to `new Date()` and `periodEnd` was never written, so
   nothing downstream could reason about the billing period.
4. `trialStart` / `trialEnd` were populated from period fields.

All four handlers are deleted. The plugin resolves the plan from the price and
reads the period off `items.data[0].current_period_*`, which is where Stripe
moved those fields in 2024.

## Webhook idempotency

`stripe_schema.WebhookEvent` with `@@unique([provider, eventId])`.
`claimWebhookEvent` inserts first and lets parallel deliveries race at the
constraint — never find-then-insert. On handler failure the claim is released so
Stripe's retry is processed rather than dropped as a duplicate.

## The seat-cap bug this introduced, and its fix

`beforeAddMember`, `beforeCreateInvitation`, and `beforeAcceptInvitation` capped
membership at `subscription.seats ?? 10`. With auto-managed seats,
`subscription.seats` **is** the current member count, so `memberCount >= maxSeats`
would have been true on every single add — every invitation and every member
addition would have failed.

The ceiling now comes from the plan catalog (`getPlanLimits(plan).seats`), which
is what a tier limit should have been keyed on all along.

## ACH on renewals

The vault flags that session-level `payment_method_types` covers only the first
charge, so renewals silently lose ACH and fall back to card.

Its fix — `subscription_data.payment_settings` in the checkout params — does not
compile against the plugin path: Stripe's
`Checkout.SessionCreateParams.SubscriptionData` has no `payment_settings` field
(that lives on Subscription create). The equivalent is applied in the
`onSubscriptionComplete` hook instead, which updates the subscription's
`payment_settings` once it exists. Best effort, so a failure cannot fail a
checkout the customer already completed.

## Plan catalog

Rewritten for per-seat: `pricePerSeat` replaces the flat `monthlyPrice`, and each
plan carries exactly one `seatPriceId`.

The plugin builds line items from `priceId` and `seatPriceId`:

```
seatPriceId !== priceId  ->  [ base price x 1 ] + [ seat price x memberCount ]
seatPriceId === priceId  ->  [ seat price x memberCount ]          (seat-only)
```

The catalog uses the **seat-only** shape: `BETTER_AUTH_PLANS` maps both
`priceId` and `seatPriceId` to the same value by construction, so the equality
that selects that branch cannot drift. One recurring price per tier, one line
item, and the invoice is exactly `pricePerSeat x seats` — which is what the
billing and plans pages display. A distinct base price would have added a flat
fee that the UI does not show.

Price IDs are `isProduction ? appConfig : test` per the vault's resolved
TODO_LIVE pattern, so a deploy cannot ship test prices. Feature gating hangs off
`limits` flags, never the plan slug.

## HTTP surface (`api/billing`)

| Route | Notes |
|---|---|
| `GET /billing/plans` | static catalog |
| `GET /billing/plan` | enriched card: tier, seats, per-seat rate, monthly total, feature flags, member list, `memberOverCap`, and a live `pendingInvoice` off the expanded `latest_invoice` |
| `GET /billing/invoices` | Stripe invoices, cursor-paged by `starting_after` |
| `POST /billing/cancel` | `cancel_at_period_end: true`, Stripe and the DB row written in-request |
| `POST /billing/resume` | clears it in-request |

Reads are open to any member; both writes are owner-only via `AdminRoleGuard`.
Org id comes from the session, never the body, so there is no cross-org path.
The `pendingInvoice` Stripe fetch is non-fatal — a failure returns the card with
`pendingInvoice: null` rather than breaking the billing page.

`active | trialing | past_due` counts as "has a plan" for billing visibility;
`StripeGuard` still admits only `active | trialing` for feature access, so a
past-due org keeps its billing page and loses the product.

## Emails

One `InvoiceEmail` template in three modes, sent to organization owners:
`invoice.payment_succeeded`, `invoice.payment_failed` (with next retry date), and
`invoice.upcoming` (lead time is configured in the Stripe dashboard, not code).

## Frontend

- `services/billing/billing-service.ts` — all billing API access
- `plans-page.tsx` — upgrade now passes `customerType: "organization"`, which is
  what enables auto-managed seats; prices read "per seat/month" and each card
  quotes the org's actual total at its current seat count
- `billing-page.tsx` — seat count and per-seat rate, computed monthly total,
  pending-invoice banner, cancel/resume for owners

## Verification

- `pnpm build:shared`, `pnpm build:api`, `pnpm build:fe` (vite + tsc) all pass
- `pnpm --filter api lint` — no errors in any new or modified file
- No Stripe call was made and no webhook was delivered; nothing here was
  exercised at runtime
- No tests written (`apps/api` has no test script)

## Not done

- Migration not applied. Run:
  `pnpm --filter api exec prisma db execute --file prisma/migrations/add_org_stripe_customer_and_webhook_events/migration.sql --schema=./prisma`
- **Two of the three seat prices do not exist in Stripe yet.** Create one
  recurring monthly price per tier (Essentials $20, Growth $49, Scale $79), each
  with `tax_behavior` set — Checkout runs `automatic_tax` and rejects a price
  with unspecified tax behaviour. All prices must share an interval and a
  currency. Then:

  | Tier | Test ID (inline in `plans.ts`) | Live ID (env) |
  |---|---|---|
  | Essentials $20 | `price_1SUpOoCVzwuBDRu4m7JnkjKf` — **stale, was created at the old price** | `STRIPE_PRICE_ESSENTIALS_SEAT` |
  | Growth $49 | `price_TODO_TEST_growth_seat` | `STRIPE_PRICE_GROWTH_SEAT` |
  | Scale $79 | `price_TODO_TEST_scale_seat` | `STRIPE_PRICE_SCALE_SEAT` |

  Stripe prices are immutable — an amount cannot be edited after creation. The
  repricing therefore needs **three new price objects**, including a replacement
  for Essentials. `pricePerSeat` in the catalog is display only; Stripe charges
  whatever the price object says, so leaving the old Essentials ID in place would
  show $20 in the UI and bill the old amount.

  Live IDs are optional in `appConfig` so dev and staging still boot; they are
  only read when `NODE_ENV=production`. Checkout fails on any tier whose ID is
  still a placeholder.
- Existing organizations have no `stripeCustomerId`; it is populated on their
  next upgrade. Existing subscriptions keep whatever `plan` value they hold.
- No backfill from `User.stripeCustomerId` to `Organization.stripeCustomerId`.
  Orgs with a live subscription bought under the old per-user customer will get a
  second Stripe customer on their next upgrade unless backfilled first.

## Sharp edges

- Better Auth swallows hook errors and still 200s Stripe, so a failed
  `onSubscriptionComplete` is silent. The ACH `payment_settings` write rides that
  hook, so a failure there means renewals quietly lose ACH.
- Seat sync is best effort inside the plugin: it logs and swallows on failure, so
  a Stripe outage during a member change leaves quantity stale until the next
  membership change.
- Removing a member lowers the seat quantity immediately and creates a proration
  credit. There is no grace period.
- The catalog depends on `priceId === seatPriceId` to stay in the seat-only
  branch. Splitting them re-introduces a flat base line item that the UI's
  `pricePerSeat x seats` total does not account for.
- `getPlanCard` retrieves the subscription from Stripe for `pendingInvoice`, so
  `GET /billing/plan` is a network call, not a pure DB read.
