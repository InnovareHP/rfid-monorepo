import { BoardFieldType, PrismaClient, StageType } from "@prisma/client";
import { renameOptionInFilter } from "../../src/lib/analytics/status-option-rename";

const prisma = new PrismaClient();

// Reworks the seeded REFERRAL columns for organizations created before the
// rename. Idempotent: every step checks for the end state first, so a second
// run reports zero changes rather than colliding with the partial unique
// indexes on Field and FieldOption.

const RENAMES: [from: string, to: string][] = [
  ["Number", "Contact Number"],
  ["Remote or Onsite", "Type of Assessment"],
  ["Status", "Admission Status"],
  ["Action Date (Accepted / Rejected)", "Action Date"],
];

const RETIRED = [
  "County",
  "Admission Type",
  "CPAP",
  "Length of Assessment",
  "Transport Name",
  "Referred Out To",
  "Additional Notes",
  "Assessed",
];

const ADDED: [name: string, type: BoardFieldType][] = [
  ["Fax", BoardFieldType.TEXT],
  ["Email", BoardFieldType.EMAIL],
];

const ASSESSMENT_OPTIONS = ["Involuntary", "Voluntary", "Unknown"];

const STATUS_OPTIONS = [
  { name: "Pending", color: "#eab308", stageType: StageType.OPEN, probability: 25 },
  { name: "Accepted", color: "#3b82f6", stageType: StageType.OPEN, probability: 75 },
  { name: "Admitted", color: "#22c55e", stageType: StageType.WON, probability: null },
  { name: "Pulled by Facility", color: "#f97316", stageType: StageType.LOST, probability: null },
  { name: "Denied", color: "#ef4444", stageType: StageType.LOST, probability: null },
  {
    name: "Transferred to another Facility",
    color: "#a855f7",
    stageType: StageType.LOST,
    probability: null,
  },
];

type Counts = Record<string, number>;

const bump = (counts: Counts, key: string, by = 1) => {
  counts[key] = (counts[key] ?? 0) + by;
};

async function migrateOrganization(organizationId: string, counts: Counts) {
  const fields = await prisma.field.findMany({
    where: { organizationId, moduleType: "REFERRAL", isDeleted: false },
    select: { id: true, fieldName: true, fieldOrder: true, moduleId: true },
  });

  if (fields.length === 0) return;

  const byName = new Map(fields.map((f) => [f.fieldName, f]));

  for (const [from, to] of RENAMES) {
    const source = byName.get(from);
    // The partial unique index rejects a rename onto a live name.
    if (!source || byName.has(to)) continue;

    await prisma.field.update({
      where: { id: source.id },
      data: { fieldName: to },
    });
    byName.delete(from);
    byName.set(to, { ...source, fieldName: to });
    bump(counts, `renamed ${from} -> ${to}`);
  }

  const retiring = RETIRED.map((name) => byName.get(name)).filter(
    (field): field is NonNullable<typeof field> => Boolean(field)
  );

  if (retiring.length > 0) {
    // Soft delete: the values stay on the records and the column is restorable.
    await prisma.field.updateMany({
      where: { id: { in: retiring.map((f) => f.id) } },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    for (const field of retiring) {
      byName.delete(field.fieldName);
      bump(counts, `retired ${field.fieldName}`);
    }
  }

  const moduleId = fields[0].moduleId;
  let nextOrder = Math.max(...fields.map((f) => f.fieldOrder)) + 1;

  for (const [name, fieldType] of ADDED) {
    if (byName.has(name)) continue;

    const created = await prisma.field.create({
      data: {
        fieldName: name,
        fieldType,
        fieldOrder: nextOrder,
        organizationId,
        moduleType: "REFERRAL",
        moduleId,
      },
      select: { id: true, fieldName: true, fieldOrder: true, moduleId: true },
    });
    byName.set(name, created);
    nextOrder += 1;
    bump(counts, `added ${name}`);
  }

  await migrateAssessmentOptions(byName.get("Type of Assessment")?.id, counts);
  await migrateStatusOptions(
    byName.get("Admission Status")?.id,
    organizationId,
    counts
  );
}

async function migrateAssessmentOptions(
  fieldId: string | undefined,
  counts: Counts
) {
  if (!fieldId) return;

  const options = await prisma.fieldOption.findMany({
    where: { fieldId, isDeleted: false },
    select: { id: true, optionName: true },
  });

  const stale = options.filter((o) => !ASSESSMENT_OPTIONS.includes(o.optionName));

  if (stale.length > 0) {
    await prisma.fieldOption.updateMany({
      where: { id: { in: stale.map((o) => o.id) } },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    bump(counts, "retired assessment options", stale.length);
  }

  const live = new Set(options.map((o) => o.optionName));
  const missing = ASSESSMENT_OPTIONS.filter((name) => !live.has(name));

  if (missing.length > 0) {
    await prisma.fieldOption.createMany({
      data: missing.map((optionName, index) => ({
        fieldId,
        optionName,
        optionOrder: index,
      })),
      skipDuplicates: true,
    });
    bump(counts, "added assessment options", missing.length);
  }
}

async function migrateStatusOptions(
  fieldId: string | undefined,
  organizationId: string,
  counts: Counts
) {
  if (!fieldId) return;

  const options = await prisma.fieldOption.findMany({
    where: { fieldId, isDeleted: false },
    select: { id: true, optionName: true },
  });

  const live = new Set(options.map((o) => o.optionName));
  const rejected = options.find((o) => o.optionName === "Rejected");

  // Rename in place so referrals already sitting on Rejected keep a status.
  if (rejected && !live.has("Denied")) {
    await prisma.fieldOption.update({
      where: { id: rejected.id },
      data: { optionName: "Denied" },
    });
    live.delete("Rejected");
    live.add("Denied");
    bump(counts, "renamed Rejected -> Denied");

    // FieldValue stores the option name, not its id, so the rows move too.
    const moved = await prisma.fieldValue.updateMany({
      where: { fieldId, value: "Rejected" },
      data: { value: "Denied" },
    });
    bump(counts, "referrals moved to Denied", moved.count);

    const history = await prisma.$executeRaw`
      UPDATE board_schema."History"
      SET "oldValue" = CASE WHEN "oldValue" = 'Rejected' THEN 'Denied' ELSE "oldValue" END,
          "newValue" = CASE WHEN "newValue" = 'Rejected' THEN 'Denied' ELSE "newValue" END
      WHERE "fieldId" = ${fieldId}
        AND ('Rejected' IN ("oldValue", "newValue"))
    `;
    bump(counts, "history rows moved to Denied", history);
  }

  const missing = STATUS_OPTIONS.filter((option) => !live.has(option.name));

  if (missing.length > 0) {
    await prisma.fieldOption.createMany({
      data: missing.map((option) => ({
        fieldId,
        organizationId,
        optionName: option.name,
        color: option.color,
        stageType: option.stageType,
        probability: option.probability,
        optionOrder: STATUS_OPTIONS.findIndex((o) => o.name === option.name),
      })),
      skipDuplicates: true,
    });
    bump(counts, "added status options", missing.length);
  }

  // Existing Pending/Admitted rows predate the new stage metadata.
  for (const option of STATUS_OPTIONS) {
    const existing = options.find((o) => o.optionName === option.name);
    if (!existing) continue;

    await prisma.fieldOption.update({
      where: { id: existing.id },
      data: {
        color: option.color,
        stageType: option.stageType,
        probability: option.probability,
        optionOrder: STATUS_OPTIONS.findIndex((o) => o.name === option.name),
      },
    });
    bump(counts, "restaged status options");
  }

  await renameSavedChartConditions(fieldId, counts);
}

async function renameSavedChartConditions(fieldId: string, counts: Counts) {
  const charts = await prisma.customAnalytic.findMany({
    select: { id: true, filter: true, numeratorFilter: true },
  });

  for (const chart of charts) {
    const filter = renameOptionInFilter(
      chart.filter,
      fieldId,
      "Rejected",
      "Denied"
    );
    const numeratorFilter = renameOptionInFilter(
      chart.numeratorFilter,
      fieldId,
      "Rejected",
      "Denied"
    );
    if (!filter && !numeratorFilter) continue;

    await prisma.customAnalytic.update({
      where: { id: chart.id },
      data: {
        ...(filter && { filter }),
        ...(numeratorFilter && { numeratorFilter }),
      },
    });
    bump(counts, "saved charts moved to Denied");
  }
}

// History rows carry the field name as it read at the time, so the charts that
// query column = 'Status' would see nothing but pre-rename rows.
async function renameHistoryColumns(counts: Counts) {
  for (const [from, to] of RENAMES) {
    const updated = await prisma.$executeRaw`
      UPDATE board_schema."History" h
      SET "column" = ${to}
      FROM board_schema."Field" f
      WHERE h."fieldId" = f."id"
        AND f."moduleType" = 'REFERRAL'
        AND h."column" = ${from}
    `;
    if (updated > 0) bump(counts, `history column ${from} -> ${to}`, updated);
  }
}

async function main() {
  const organizations = await prisma.field.findMany({
    where: { moduleType: "REFERRAL" },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  const counts: Counts = {};

  for (const { organizationId } of organizations) {
    await migrateOrganization(organizationId, counts);
  }

  await renameHistoryColumns(counts);

  const entries = Object.entries(counts);
  if (entries.length === 0) {
    console.log("Nothing to migrate");
    return;
  }

  console.log(`Migrated ${organizations.length} organizations`);
  for (const [label, count] of entries.sort()) {
    console.log(`  ${label}: ${count}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
