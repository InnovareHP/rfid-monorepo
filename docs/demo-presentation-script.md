# Demo presentation script

A run sheet for presenting the dashboard on seeded demo data. Read the prep
section the day before; the numbered beats are what you say and click on the day.

## Before the room

1. **Pick a throwaway organization.** Never seed a customer's org. Create one
   through normal signup so onboarding seeds its modules, fields and kanban
   stages first — the demo seeder needs those to exist.
2. **Note the organization id** from the URL: `/<organizationId>/master-list`.
3. **Make sure at least one member has the liaison role.** Records are assigned
   to liaisons, and every per-liaison report groups by that. With no liaison the
   seeder falls back to any member and the liaison charts look empty.
4. **Seed:**

   ```bash
   pnpm --filter api seed:demo -- --org=<organizationId>
   ```

   Re-running adds more. To start clean:

   ```bash
   pnpm --filter api seed:demo -- --org=<organizationId> --wipe
   ```

   `--wipe` clears the seeded rows and writes a fresh set, so the org still
   ends up full. To clear them and stop:

   ```bash
   pnpm --filter api wipe:demo -- --org=<organizationId>
   ```

   Both delete the records whose names come out of the seeder's own catalog,
   plus the visit logs, expenses, mileage and the Territory Operations task
   project that go with them. A record someone typed is left alone. The delete
   is permanent, not a soft delete, so check the org id twice.

5. **Pick a size** with `--profile`, if the default is the wrong shape for the
   room:

   ```bash
   pnpm --filter api seed:demo -- --org=<organizationId> --profile=starter
   ```

   | Profile | Facilities | Referrals | Visit logs | Tasks | History window |
   | --- | --- | --- | --- | --- | --- |
   | `starter` | 12 | 60 | 40 | 15 | 6 months |
   | `growth` (default) | 40 | 320 | 180 | 36 | 11 months |
   | `enterprise` | 120 | 1200 | 520 | 75 | 18 months |

   Only volume and how far back the data reaches change. The vocabulary, the
   link shapes and the admit/deny mix are the same in all three, so a run sheet
   rehearsed on one reads the same on another. `starter` is for a short call
   where a long table is a distraction; `enterprise` is for showing that the
   board, the filters and the charts hold up at volume.

6. **Restart the API** if you have changed code since it started, then hard
   refresh the browser.
7. **Rehearse once, end to end.** The data is deterministic, so what you see in
   the rehearsal is what you get on the day.

What `growth` gives you: 40 facilities, 320 referrals linked to them, roughly
4,000 field values and 180 visit logs, spread across the last eleven months and
weighted toward recent weeks so the trends slope. Facilities, contacts and
companies each carry an Address consistent with the city and zip on the row.

## The run sheet

### 1. Master Marketing List — "this is the book of business"

Open **Master Marketing List**.

- Point at the stat strip: total facilities, active partners, counties covered.
- Scroll the table. Note that columns are the organization's own — beds, county,
  psychiatric services — not a fixed schema.
- Click a cell and edit it inline. Say: every change is written to history with
  who and when.

**Say:** *"Every facility you market to lives here, with whatever fields your
team actually tracks."*

### 2. Add a facility — "and it stops you duplicating"

Click **Create Facilities**. Type a name close to one already in the list, for
example `Cedar Ridge Nursing and Rehab`.

- The duplicate dialog appears and names the record it matched.
- Point out that an exact repeat is refused outright, and a near match too.

**Say:** *"Duplicate facilities are how a referral history gets split in half.
It is checked on create, on rename and on import."*

> If it does not fire, the API is running an older build. Restart it.

### 3. Analyze a facility — "what have we actually done here?"

From the list, open **Analyze** on one of the first few facilities — those carry
the most volume.

- Referrals sent, referrals per week, tier.
- Touchpoints by type, stakeholders, the visit history behind it.

**Say:** *"This is the answer to 'is this relationship worth the drive'."*

### 4. Referral list — "the pipeline"

Open the referral list.

- Filter to `Pending`.
- Open one record and walk the fields: payor, admission type, assessor.
- Show the kanban view if the audience is operational rather than executive.

### 5. Analytics — "the part leadership asks for"

Open **Analytics**.

- **Top facilities** — a handful of sources carry most of the volume.
- **Referral source scorecard** — per facility: count, per week, tier.
- **Conversion** and **denial reasons** — roughly a fifth of the seeded
  referrals are rejected, each with a reason, so this is populated.
- **County heat map** — geography of the book.
- **Payer mix**.

**Say:** *"None of this is a separate report anyone maintains. It is the same
records your liaisons are already filling in."*

### 6. Import — "you are not typing your list in again"

Open the import flow with a small spreadsheet.

- Map the columns.
- Point out that duplicates against the board and inside the file are both
  skipped, and that the count comes back when the job finishes.

### 7. Compliance, if the audience is clinical or legal

Open **Compliance**.

- HIPAA mode, the BAA, IP allowlist, retention.
- If HIPAA mode is on and the account lacks a second factor, the readiness gate
  appears with both steps. That is worth showing deliberately rather than
  hitting it by accident.

**Say:** *"PHI columns are encrypted at rest, access is logged, and the second
factor is enforced rather than suggested."*

## Questions you will get

**"Can we use our own fields?"** Yes — columns are per organization and added in
the app, not by us.

**"Where does the data live?"** Postgres, encrypted at rest for PHI columns,
scoped per organization on every query.

**"Can we import from our current system?"** CSV or spreadsheet, with duplicate
detection on the way in.

**"What if two people edit the same record?"** Last write wins, and history
shows both.

**"How do we pay?"** Self-serve by card, or a negotiated contract invoiced per
period. Contracts are set up by us and paid from the billing page.

## If something goes wrong

| Symptom | Cause | Fix |
| --- | --- | --- |
| Empty analytics | Referrals not linked to facilities | Re-run the seeder; it writes the links |
| Duplicate dialog never appears | API running a stale build | `rm -rf apps/api/dist && pnpm dev:api` |
| Liaison charts empty | No member holds the liaison role | Set one, re-run with `--wipe` |
| Seeder exits on fields | Onboarding never ran for that org | Use an org created through signup |
| Numbers changed since rehearsal | Seeder run more than once | `--wipe` and seed again |

## Do not

- Seed a customer organization.
- Run `--wipe` without reading the org id aloud first.
- Demo on the same org someone else is testing on.
