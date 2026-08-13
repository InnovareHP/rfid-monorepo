# Custom CRM modules — scoped plan

Lets an organization create its own record type ("Vendors", "Facilities",
"Volunteers") with a guided setup, instead of being limited to the four modules
baked into the schema.

Written 2026-08-13 after the email builder and unsubscribe work. Phases 1 and 2
are built. The migration below has not been run against any database, and phase
2 reads `moduleId`, so neither phase can ship until it does. Phases 3 to 5 are
not started.

`moduleType` stays non-null through phases 2 to 4, which means a custom module's
rows will carry `LEAD`. Reads that turn a record into a module string therefore
go through `module.key`, never the column.

## The one real blocker

`ModuleType` is a **Prisma enum**, not data:

```prisma
enum ModuleType {
  LEAD
  REFERRAL
  CONTACT
  COMPANY

  @@schema("board_schema")
}
```

Everything else about the CRM is already dynamic. Fields are per-org rows, and
values are EAV, so a new module needs no new tables — only a new value in a type
that currently requires a migration to extend. Turning that enum into a table is
the whole project.

## What is actually affected

Measured, not estimated:

| Surface | Count |
| --- | --- |
| `moduleType` / `ModuleType` refs in `apps/api/src` | ~313 |
| `moduleType` / `ModuleType` refs in `apps/fe/src` | ~227 |
| Prisma models carrying the column | 4 — `Field`, `Board`, `RecipientGroup`, `Form` |

Most of the ~540 references just pass the value through. The ones that decide
behaviour are the short list; the rest change type only.

**Good news, three things are already module-agnostic and need no work:**

- **Permissions.** `DOMAIN_STATEMENT` in `packages/shared/src/lib/permission.ts`
  gates on `record` / `field` / `report`, never on a module. A new module
  inherits the existing roles for free. (An earlier note of mine claimed
  permissions switch on module type — they do not.)
- **Fields and values.** `Field` rows are already per-org and per-module;
  `FieldValue` is keyed on `(recordId, fieldId)`.
- **Encryption and tenancy.** `FieldValue.value` and `Board.recordName` are in
  `ENCRYPTED_FIELDS`, and any model with `organizationId` is auto-scoped by
  `tenant-extension.ts`. A new module inherits both.

**Places that genuinely branch on the module:**

- `api/board/` — 9 files, the largest cluster; record CRUD, columns, import.
- `api/kanban/` — defaults to `"LEAD"` in the controller when the query param is
  absent (`kanban.controller.ts:43,62,79`).
- `api/marketing/group/` — audience resolution picks the module's `EMAIL` field.
- `api/marketing/form/`, `api/marketing/blast/` — form and group module choice.
- `api/analytics/`, `api/options/`, `api/liaison/`, `api/email/`.
- `lib/auth/` — onboarding seeds the starting modules and their default fields.

Frontend hardcoded module lists to replace with a fetch:

- `components/marketing/forms/marketing-forms-list-page.tsx:49`
- `components/marketing/groups/group-editor-dialog.tsx:40`
- `hooks/use-board-sync.ts:12` — `MODULE_QUERY_KEYS` maps module to query key.

## Shape of the change

### 1. Enum becomes a table

```prisma
model Module {
  id             String   @id @default(uuid())
  key            String   // stable, uppercase, used in URLs and query keys
  label          String   // "Vendors"
  labelSingular  String   // "Vendor"
  icon           String?
  isSystem       Boolean  @default(false) // the original four
  moduleOrder    Int      @default(0)
  organizationId String
  ...
  @@unique([organizationId, key])
}
```

The four current values become seeded `isSystem` rows per org. `isSystem` exists
so the app can keep special-casing what genuinely is special (referral linking,
the master list analytics) without blocking deletion of user-made modules.

### 2. Columns become foreign keys

`Board`, `Field`, `RecipientGroup`, `Form` each gain `moduleId` alongside the
existing enum column. This is the risky step and it must be expand/contract,
never a single cutover:

1. Add nullable `moduleId` + the `Module` table; seed one row per (org, enum
   value).
2. Backfill `moduleId` from the enum column.
3. Ship code that **writes both** and reads `moduleId`.
4. Make `moduleId` required.
5. Drop `moduleType` and the enum in a later, separate migration.

Steps 1–2 and 5 are manual SQL in `prisma/migrations/<name>/migration.sql`,
matching the convention already used by `drop_blast_module_type` and
`email_subscribers_and_unsubscribe`.

### 3. Routing is the biggest frontend change

Today each module has its own route folder — `master-list/`, `referral-list/`,
`contacts/`, `companies/`. A user-created module has no folder, so records need
one generic route:

```
/$team/records/$moduleKey
/$team/records/$moduleKey/$recordId
```

The four existing paths stay as-is so no link breaks, and are rewritten to
render the same generic components. The sidebar builds its record section from
the module list instead of a static array.

`MODULE_QUERY_KEYS` becomes `["records", moduleKey]`, which removes the map.

### 4. Setup wizard

Three steps, mirroring how `landing-page-builder-page.tsx` and the form builder
already work:

1. **Name it** — label, singular label, icon. Key derived via `toSlug` from
   `@dashboard/shared`, uppercased, editable once and then frozen.
2. **Fields** — start from a template (People / Company / Custom) then add
   fields with the existing field-type picker. Reuses `Field` creation as-is.
3. **Review** — show the resulting table and create.

Templates matter more than they look: a blank module is a blank table, and the
first-run experience is what makes this feature usable rather than clever.

## Decisions — settled 2026-08-13

### 1. Deletable while empty, archive once it has data

Hard delete on a module holding records orphans `Board`, `FieldValue`, and any
`RecipientGroup` or `Form` pointing at it. Archive-only is still wrong for the
common case: someone typos "Vendorss" during setup and wants it gone.

Guard is `isSystem === false && recordCount === 0`, not count alone. The four
seeded modules are never deletable and never archivable — analytics, marketing
groups, `REFERRAL_LINK`, and the onboarding seed all reference them by key.

- The count check runs inside the delete transaction, not as a pre-check.
  A pre-check races a concurrent record create and orphans anyway.
- `isArchived` on `Module`, not a soft-delete `deletedAt`. Different meanings:
  archived rows still render for existing records, deleted rows never existed.
  Do not collapse them into one column.
- Archived modules disappear from pickers but keep working for existing records.
  A group or form aimed at an archived module warns at read time rather than
  silently resolving to nothing — no back-reference index needed.
- Foreign keys back this up but are not the UX. `Field` and `Board` cascade;
  `RecipientGroup` and `Form` restrict. `Board` cascades rather than restricts
  because it soft-deletes, so a module the app counts as empty can still hold
  `isDeleted` rows that RESTRICT would choke on. The delete UI still needs its
  own "used by 2 forms, 1 group" pre-check — a raw Postgres FK violation is a
  backstop for a wrong check, not a message anyone should read.

### 2. Counts plus one auto-derived breakdown

The chart infra already exists (`KpiStatTile`, `analytics/charts/`). A custom
module gets record count, created-over-time, and a group-by driven by its own
`STATUS` or `DROPDOWN` fields. All of it derives from field types — the field
type table is the config, so there is no per-module code.

The user chooses which tiles show. That is the whole surface: not a chart
builder, no axis pickers.

The bespoke lead and referral dashboards stay `isSystem`-only. They encode
conversion semantics a "Vendors" table does not have.

### 3. No cross-module linking in v1, and `REFERRAL_LINK` is not widened

Widening `REFERRAL_LINK` entrenches a lead-semantic field: every module
inheriting it inherits "this row refers to a patient", which "Vendors" does not
mean. It is also referenced across 14 files, so unwinding it later is real work.

Building the generic `RECORD_LINK` replacement now is also wrong — it means
designing a cross-module picker (target module, cardinality, cascade on module
archive, master-list filtering, `form-field-picker` support) before any org has
two custom modules to link. That doubles the scope.

Ship v1 with no cross-module link at all. Adding `RECORD_LINK` later is purely
additive: one new `BoardFieldType` member, one new `RelationType` member,
`BoardRelation` unchanged, no migration on existing custom modules. That stays
true only while `REFERRAL_LINK` is left alone.

`RECORD_LINK` is the intended successor — a record picker naming a target
module, which subsumes `REFERRAL_LINK`. Recorded here so nobody reaches for
`REFERRAL_LINK` instead.

### 4. Cap of 10 custom modules, hardcoded

The binding constraint is sidebar legibility, not storage. The cap counts
`isSystem: false` modules only — otherwise an org that seeds four starts with
six.

One exported `MAX_CUSTOM_MODULES` constant, checked in one place in the module
service. Not inline in the controller and again in a frontend guard: when this
becomes a plan lever, the change is that constant to an entitlement lookup at a
single call site.

`EntitlementGuard` exists and module count is a natural plan lever later, but do
not wire it on day one. Coupling a new feature to billing before anyone pays for
it drags a plan migration through every iteration on the feature.

### 5. The four current modules are seeded defaults, not templates

An org gets LEAD / REFERRAL / CONTACT / COMPANY rows at onboarding and creates
siblings alongside them. A client-created module starts blank and picks field
types from the picker — it never clones a default module's field set. A cloned
CONTACT arrives carrying lead-shaped fields the new module does not mean, which
is the same failure as decision 3.

This does not conflict with the wizard templates in "Setup wizard" below: those
are fixed People / Company / Custom field sets shipped by us, not a copy of
another module instance in the org.

The sidebar renders defaults in their current position and custom modules below
a divider. Without the split, a client-made "Leads Copy" sits next to real Leads
and support tickets follow.

## Suggested phasing

| Phase | Content | Shippable alone |
| --- | --- | --- |
| 1 | `Module` table, seed, backfill, dual-write. No user-visible change. **Built, migration unapplied.** | Yes |
| 2 | Read paths move to `moduleId`; hardcoded lists become fetches. **Built, blocked on the phase 1 migration.** | Yes |
| 3 | Generic `/records/$moduleKey` routes; sidebar built from data. **Built, less the record detail route.** | Yes |
| 4 | Setup wizard and module management screen. | Yes — the feature lands here |
| 5 | Drop `moduleType` and the enum. | Yes |

Phases 1–3 are invisible refactors that de-risk phase 4. If the work is ever
paused, stopping after any phase leaves the app in a working state — which is
the main argument for this order over building the wizard first.

## What not to do

- Do not add module keys to the Prisma enum as a stopgap. It reintroduces a
  migration per customer request, which is the problem being solved.
- Do not let the module key be free text in URLs without validation; it is
  tenant-supplied and lands in route params and query keys.
- Do not fold this into another feature branch. It touches ~540 references and
  needs to be reviewable on its own.
- Do not widen `REFERRAL_LINK` to accept custom modules. It is the one change
  here that is expensive to undo — see decision 3.
