/*
 * READ-ONLY audit. Never writes, never deletes, never migrates.
 *
 * Until it was removed, normalizeOptionValue() ran every imported cell through
 *   .replace(/(.+?)\1+/g, "$1")
 * which deleted repeated sequences: "100" -> "10", "88" -> "8",
 * "555-1200" -> "5-120", "Bill" -> "Bil", "Skilled" -> "Skiled".
 *
 * The transform is lossy, so a corrupted value cannot be diagnosed in
 * isolation -- "10" is a perfectly ordinary bed count. This script therefore
 * reports four signals separately and never merges them into one number:
 *
 *   A DEFINITE   two FieldOptions on one field where one collapses to the other
 *   B LIKELY     a select-type value matching no live option on its field
 *   C RECOVERED  History holds a prior value that collapses to the value now
 *                stored -- the original is known and repair is possible
 *   D SUSPECT    an upper bound: values that are fixed points of the collapse,
 *                so they *could* have come through it. Mostly false positives.
 */
import { BoardFieldType } from "@prisma/client";
import { prisma } from "../src/lib/prisma/prisma";
import { runUnscoped } from "../src/lib/prisma/tenant-context";

// The exact regex that was removed, kept here so the audit tests the real
// historical transform rather than an approximation of it.
const collapse = (value: string) =>
  value
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .replace(/(.+?)\1+/g, "$1")
    .trim();

const SELECT_TYPES: BoardFieldType[] = [
  BoardFieldType.DROPDOWN,
  BoardFieldType.STATUS,
  BoardFieldType.MULTISELECT,
];

// A one-character value collapses to itself and carries no signal.
const isFixedPoint = (value: string) =>
  value.length > 1 && collapse(value) === value;

type Row = { label: string; detail: string };

const show = (title: string, rows: Row[], cap = 40) => {
  console.log(`\n${title}  (${rows.length})`);
  if (rows.length === 0) {
    console.log("  none");
    return;
  }
  for (const row of rows.slice(0, cap)) {
    console.log(`  ${row.label}  ${row.detail}`);
  }
  if (rows.length > cap) {
    console.log(`  ... ${rows.length - cap} more`);
  }
};

async function main() {
  const fields = await prisma.field.findMany({
    select: {
      id: true,
      fieldName: true,
      fieldType: true,
      organizationId: true,
      isDeleted: true,
      options: { select: { id: true, optionName: true } },
    },
  });

  const fieldById = new Map(fields.map((field) => [field.id, field]));

  // ---- A: option pairs where one is the collapse of the other -------------
  const definite: Row[] = [];
  for (const field of fields) {
    const names = field.options.map((option) => option.optionName);
    const present = new Set(names);

    for (const name of names) {
      const collapsed = collapse(name);
      if (collapsed !== name && present.has(collapsed)) {
        definite.push({
          label: `[${field.organizationId}] ${field.fieldName}`,
          detail: `"${name}" also exists collapsed as "${collapsed}"`,
        });
      }
    }
  }

  // ---- B/D: scan stored values -------------------------------------------
  const orphanSelect: Row[] = [];
  const suspect: Row[] = [];
  let totalValues = 0;
  let provablyClean = 0;

  const PAGE = 5_000;
  for (let skip = 0; ; skip += PAGE) {
    const values = await prisma.fieldValue.findMany({
      skip,
      take: PAGE,
      orderBy: { id: "asc" },
      select: { id: true, value: true, fieldId: true, recordId: true },
    });
    if (values.length === 0) break;

    for (const row of values) {
      const text = (row.value ?? "").trim();
      if (!text) continue;
      totalValues += 1;

      // A value the collapse would have altered cannot have passed through it.
      if (collapse(text) !== text) {
        provablyClean += 1;
        continue;
      }

      const field = fieldById.get(row.fieldId);
      if (!field) continue;

      if (SELECT_TYPES.includes(field.fieldType)) {
        const options = new Set(
          field.options.map((option) => option.optionName.toLowerCase())
        );
        const parts =
          field.fieldType === BoardFieldType.MULTISELECT
            ? text.split(",").map((part) => part.trim())
            : [text];

        for (const part of parts) {
          if (part && !options.has(part.toLowerCase())) {
            orphanSelect.push({
              label: `[${field.organizationId}] ${field.fieldName}`,
              detail: `record ${row.recordId} holds "${part}", not an option on this field`,
            });
          }
        }
      }

      if (isFixedPoint(text)) {
        suspect.push({
          label: `[${field.organizationId}] ${field.fieldName}`,
          detail: `record ${row.recordId} = "${text}"`,
        });
      }
    }
  }

  // ---- C: originals recoverable from History -----------------------------
  const recovered: Row[] = [];
  const historyPage = 5_000;
  for (let skip = 0; ; skip += historyPage) {
    const events = await prisma.history.findMany({
      skip,
      take: historyPage,
      orderBy: { id: "asc" },
      where: { fieldId: { not: null } },
      select: {
        recordId: true,
        fieldId: true,
        oldValue: true,
        newValue: true,
        createdAt: true,
      },
    });
    if (events.length === 0) break;

    for (const event of events) {
      const before = (event.oldValue ?? "").trim();
      const after = (event.newValue ?? "").trim();
      if (!before || !after) continue;

      // The import wrote `after`; if `after` is exactly what the collapse would
      // have produced from `before`, then `before` is the lost original.
      if (before !== after && collapse(before) === after) {
        const field = event.fieldId ? fieldById.get(event.fieldId) : undefined;
        recovered.push({
          label: `[${field?.organizationId ?? "?"}] ${field?.fieldName ?? event.fieldId}`,
          detail: `record ${event.recordId}: "${after}" was originally "${before}" (${event.createdAt.toISOString().slice(0, 10)})`,
        });
      }
    }
  }

  console.log("Collapsed-value audit -- READ ONLY, nothing was modified.");
  console.log(
    `\nScanned ${totalValues} non-empty field values across ${fields.length} fields.`
  );
  console.log(
    `${provablyClean} of them cannot have passed through the collapse and are provably intact.`
  );

  show(
    "A. DEFINITE -- duplicate options, one the collapse of the other",
    definite
  );
  show(
    "B. LIKELY -- select value matching no option on its field",
    orphanSelect
  );
  show("C. RECOVERED -- History still holds the original value", recovered);
  show(
    "D. SUSPECT -- fixed points of the collapse; an UPPER BOUND, mostly false positives",
    suspect,
    20
  );

  console.log(
    `\nRepair guidance: A and C are actionable. C is exact -- the original is known.` +
      `\nB needs a human to decide the intended option. D is not a finding on its own;` +
      `\nuse it only to size the blast radius (${suspect.length} of ${totalValues} values).`
  );
}

runUnscoped(main)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
