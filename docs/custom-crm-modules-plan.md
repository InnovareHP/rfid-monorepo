# Custom CRM modules — scoped plan

Lets an organization create its own record type ("Vendors", "Facilities",
"Volunteers") with a guided setup, instead of being limited to the four modules
baked into the schema.

Not started. This is a design and sequencing doc, written 2026-08-13 after the
email builder and unsubscribe work. Nothing here has been built.

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

## Decisions to make before starting

1. **Is a module deletable?** Deleting one orphans every record in it. Suggest
   archive-only for v1, hard delete behind a typed confirmation later.
2. **Does a custom module get analytics?** The current analytics are written
   against lead and referral semantics (stages, conversion). Probably v1 shows
   record counts only, and the existing dashboards stay `isSystem`-only.
3. **Does `REFERRAL_LINK` work across custom modules?** Board relations are
   already generic, but the UI assumes lead ↔ referral. Decide whether a custom
   module can participate.
4. **Cap per org.** A soft limit (say 10) prevents a tenant from generating
   hundreds of modules and turning the sidebar into a scroll.

## Suggested phasing

| Phase | Content | Shippable alone |
| --- | --- | --- |
| 1 | `Module` table, seed, backfill, dual-write. No user-visible change. | Yes |
| 2 | Read paths move to `moduleId`; hardcoded lists become fetches. | Yes |
| 3 | Generic `/records/$moduleKey` routes; sidebar built from data. | Yes |
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
