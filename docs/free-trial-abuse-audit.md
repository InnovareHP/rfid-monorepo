# Free trial abuse audit

Read-only queries for the state the 2026-09-10 guards now prevent going
forward. Run them before shipping: the guards do not touch rows that already
exist, so anything they turn up needs a decision rather than a migration.

Table names are quoted because the Prisma models carry no `@@map`, so Postgres
holds them mixed case.

## Owners holding more than one trialled organization

Each row is an account that took the 14 day trial more than once. After the
change, its next checkout carries no trial at all.

```sql
SELECT
  u.email,
  count(DISTINCT s."referenceId") AS trialled_orgs,
  count(*) FILTER (WHERE s.status = 'active') AS paying_orgs
FROM auth_schema."Member" m
JOIN auth_schema."User" u ON u.id = m."userId"
JOIN stripe_schema."Subscription" s ON s."referenceId" = m."organizationId"
WHERE m.role = 'owner'
  AND (s."trialStart" IS NOT NULL OR s.status = 'trialing')
GROUP BY u.email
HAVING count(DISTINCT s."referenceId") > 1
ORDER BY trialled_orgs DESC;
```

## Owners already past the organization cap

Three or more owned organizations and nothing billing. These accounts cannot
create another organization now. Expect a support ticket from any that is a
real customer, and confirm before assuming abuse.

```sql
SELECT
  u.email,
  count(*) AS owned_orgs,
  count(s.id) FILTER (WHERE s.status = 'active') AS paying_orgs
FROM auth_schema."Member" m
JOIN auth_schema."User" u ON u.id = m."userId"
LEFT JOIN stripe_schema."Subscription" s ON s."referenceId" = m."organizationId"
WHERE m.role = 'owner'
GROUP BY u.email
HAVING count(*) >= 3
   AND count(s.id) FILTER (WHERE s.status = 'active') = 0
ORDER BY owned_orgs DESC;
```

## Accounts that are one mailbox under different aliases

`canonicalSignupEmail` only applies to signups from 2026-09-10 on. This finds
the ones already in the table: same gmail inbox, different stored address.

```sql
SELECT
  replace(split_part(split_part(u.email, '@', 1), '+', 1), '.', '')
    || '@gmail.com' AS mailbox,
  count(*) AS accounts,
  array_agg(u.email ORDER BY u."createdAt") AS addresses
FROM auth_schema."User" u
WHERE split_part(u.email, '@', 2) IN ('gmail.com', 'googlemail.com')
GROUP BY 1
HAVING count(*) > 1
ORDER BY accounts DESC;
```

## Card reuse across organizations

Not answerable in Postgres: the card fingerprint lives in Stripe. Stripe
Dashboard, Payments, group by `payment_method.card.fingerprint`, or a Radar
rule that blocks a card already attached to another customer on a trial. This
is the only one of the four that catches an abuser who shares no email, no IP
and no device with their previous account.
