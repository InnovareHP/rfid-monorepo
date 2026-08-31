# Import duplicate detection — plan

Status: proposed, nothing implemented.

## Question

For the import flow, do we ship a duplicate warning or a scanning feature?

A warning cannot exist without detection, so the two are not alternatives. The
real split is which duplicate we detect and where the scan runs.

## Current state

| Piece | State |
| --- | --- |
| `apps/fe/src/components/import/master-list-import-page.tsx` | Parses the whole file client-side; rows sit in browser memory before the POST |
| `apps/api/src/api/board/board.service.ts` `createRecordDataFromCSV` | Validates mapping and creates new columns only. No duplicate check |
| `apps/api/src/api/board/csv-import.processor.ts` | Blind `createMany` on Board and FieldValue. Every row becomes a new record |
| `apps/api/src/api/board/board.service.ts` `findDuplicateRecords` | Exists. EMAIL and PHONE fields only. `GET /api/boards/duplicates` |
| `apps/fe/src/components/crm-list/crm-record-create.tsx` | Consumes the endpoint as a non-blocking "Possible duplicate" dialog |

## Two problems, different cost

**A. Duplicates inside the document.** Row 12 equals row 88 of the same file.
The rows are already parsed in the browser, so this is one pass over `rows`.
No API call, no decryption, no backend change.

**B. Duplicates against existing records.** `FieldValue.value` is encrypted at
rest, so matching is app-layer: `findDuplicateRecords` loads every EMAIL and
PHONE FieldValue in the organization and filters after decryption in Node.
Calling it per row for a 5000-row file means 5000 full scans. Not viable in
that shape.

## Phase 1 — in-file scan, client-side

Ship first. Backend untouched.

- Runs after the mapping step, since the duplicate key needs `nameColumn` plus
  the headers mapped to EMAIL and PHONE fields.
- Key precedence: normalized email, else normalized phone, else `recordName`.
  Normalization reuses `normalizeOptionValue` from `@dashboard/shared`, lowercased.
- One pass over `rows` builds `Map<key, rowIndex[]>`; groups longer than one are
  the duplicate set. Derived during render from `rows` and `columnMap`, not
  stored in `useState`.
- Warning banner above the Upload button: "12 duplicate rows found", with
  `Skip duplicates` and `Import anyway`. Non-blocking, matching the existing
  record-create dialog precedent.
- `ImportPreviewTable` shows 5 rows only, so duplicate rows get a badge there
  and the banner expands to the full list.
- Skip mode filters `rows` before the POST. Keeps the first occurrence of each key.

Files: new helper in `apps/fe/src/lib/helper/`, new banner component in
`apps/fe/src/components/import/`, edits to `master-list-import-page.tsx` and
`import-preview-table.tsx`.

## Phase 2 — existing-record scan, one batched pass

- New endpoint, not the per-record one. Accepts the list of normalized keys
  from the parsed file.
- Service does a single decrypt pass over the organization's EMAIL and PHONE
  FieldValues, builds `Map<normalizedValue, record>`, then intersects with the
  submitted keys. Cost is one current `findDuplicateRecords` call regardless of
  file size.
- Returns matched count plus a capped sample. The UI merges it into the Phase 1
  banner: "12 in file, 43 already exist".
- Skip-existing becomes a flag on the queue job so `csv-import.processor.ts`
  filters at dequeue, since the board can change between scan and processing.

## Rejected

Duplicate checking inside `csv-import.processor.ts` per row. It runs inside the
write transaction, needs a decrypt scan per row, and the user only sees the
result after the import has already committed. Detection has to happen before
the upload.

## To do

Phase 1
- [ ] Duplicate-key helper in `apps/fe/src/lib/helper/` with unit tests
- [ ] Derive duplicate groups in `master-list-import-page.tsx` from rows and columnMap
- [ ] Duplicate warning banner component with skip and import-anyway
- [ ] Duplicate row badge in `import-preview-table.tsx`
- [ ] Filter rows on skip before `importLeads`

Phase 2
- [ ] Batched duplicate-scan service method on `board.service.ts`
- [ ] Controller route plus DTO, `@RequirePermission({ record: ["read"] })`
- [ ] Frontend service call and banner merge
- [ ] `skipExisting` flag on `CsvImportJobData`, filter in the processor
