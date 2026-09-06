import type { ModuleType, Prisma, PrismaClient } from "@prisma/client";
import { encryptString } from "../../../src/lib/crypto/crypto";
import { recordNameIndexes } from "../../../src/lib/crypto/record-name-index";

// Board.moduleType is the legacy column and still required, so a write needs
// both it and the moduleId that replaced it.
const MODULE_TYPE_BY_KEY: Record<string, ModuleType> = {
  LEAD: "LEAD",
  REFERRAL: "REFERRAL",
  CONTACT: "CONTACT",
  COMPANY: "COMPANY",
};

// Board.id is optional on the generated input because the column defaults,
// but every row here sets it and the persist step reads it back.
export type DemoBoardRow = Prisma.BoardCreateManyInput & { id: string };

export type DemoField = { id: string; fieldName: string };

export type DemoMember = { id: string; userId: string };

export type FieldValueRow = {
  recordId: string;
  fieldId: string;
  value: string;
  organizationId: string;
};

export type DemoContext = {
  organizationId: string;
  organizationName: string;
  moduleIdFor: (key: string) => string;
  fieldsFor: (key: string) => DemoField[];
  assignable: DemoMember[];
};

export async function loadContext(
  prisma: PrismaClient,
  organizationId?: string
): Promise<DemoContext> {
  const organization = organizationId
    ? await prisma.organization.findUnique({ where: { id: organizationId } })
    : await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });

  if (!organization) {
    throw new Error(
      "No organization found. Pass --org=<organizationId> for the one to seed."
    );
  }

  const scope = organization.id;

  const modules = await prisma.module.findMany({
    where: { organizationId: scope },
    select: { id: true, key: true },
  });

  const moduleIdFor = (key: string) => {
    const found = modules.find((module) => module.key === key);
    if (!found) throw new Error(`Organization has no ${key} module`);
    return found.id;
  };

  // moduleId is the current identity of a field; moduleType only still holds
  // for the four system modules and says nothing about a custom one.
  const fields = await prisma.field.findMany({
    where: { organizationId: scope, isDeleted: false },
    select: { id: true, fieldName: true, moduleId: true },
  });

  const fieldsFor = (key: string) => {
    const moduleId = moduleIdFor(key);
    const owned = fields.filter((field) => field.moduleId === moduleId);

    if (!owned.length) {
      throw new Error(
        `Organization has no ${key} fields. Onboarding seeding has to run first.`
      );
    }

    return owned.map(({ id, fieldName }) => ({ id, fieldName }));
  };

  const members = await prisma.member.findMany({
    where: { organizationId: scope },
    select: { id: true, role: true, userId: true },
  });

  // Records are assigned to liaisons only, which is what the app enforces and
  // what every per-liaison report groups by.
  const liaisons = members.filter((member) => member.role === "liason");
  const assignable = (liaisons.length ? liaisons : members).map(
    ({ id, userId }) => ({ id, userId })
  );

  if (!assignable.length) {
    throw new Error("Organization has no members to assign records to");
  }

  // Checked here rather than in the task step: referrals are not covered by the
  // record name index, so a re-run after a late failure duplicates them.
  const taskStatuses = await prisma.taskStatus.count({
    where: { organizationId: scope },
  });

  if (!taskStatuses) {
    throw new Error(
      "Organization has no task statuses. Run seed:task-statuses first."
    );
  }

  return {
    organizationId: scope,
    organizationName: organization.name,
    moduleIdFor,
    fieldsFor,
    assignable,
  };
}

export const boardRow = (input: {
  id: string;
  name: string;
  moduleKey: string;
  moduleId: string;
  organizationId: string;
  assignedTo: string;
  createdAt: Date;
}): DemoBoardRow => ({
  id: input.id,
  recordName: encryptString(input.name),
  ...recordNameIndexes(input.name),
  moduleType: MODULE_TYPE_BY_KEY[input.moduleKey] ?? "CUSTOM",
  moduleId: input.moduleId,
  organizationId: input.organizationId,
  assignedTo: input.assignedTo,
  createdAt: input.createdAt,
});

export const valueRow = (
  recordId: string,
  fields: DemoField[],
  fieldName: string,
  value: string,
  organizationId: string
): FieldValueRow | null => {
  const field = fields.find((candidate) => candidate.fieldName === fieldName);
  if (!field || !value) return null;

  return {
    recordId,
    fieldId: field.id,
    value: encryptString(value),
    organizationId,
  };
};

export const collectValues = (
  recordId: string,
  fields: DemoField[],
  pairs: [string, string][],
  organizationId: string,
  into: FieldValueRow[]
) => {
  for (const [fieldName, value] of pairs) {
    const row = valueRow(recordId, fields, fieldName, value, organizationId);
    if (row) into.push(row);
  }
};

// History is stored in plaintext, the same as the app writes it.
export const historyRow = (input: {
  recordId: string;
  action: string;
  column: string;
  newValue: string;
  oldValue?: string;
  fieldId?: string;
  createdBy: string;
  organizationId: string;
  createdAt: Date;
}): Prisma.HistoryCreateManyInput => ({
  recordId: input.recordId,
  action: input.action,
  column: input.column,
  oldValue: input.oldValue ?? null,
  newValue: input.newValue,
  fieldId: input.fieldId ?? null,
  createdBy: input.createdBy,
  organizationId: input.organizationId,
  createdAt: input.createdAt,
});

export type RecordBatch = {
  rows: DemoBoardRow[];
  values: FieldValueRow[];
  history: Prisma.HistoryCreateManyInput[];
  relations?: Prisma.BoardRelationCreateManyInput[];
};

// A unique blind index covers the record name on every module but REFERRAL, so
// a re-run silently drops rows that are already there. Writing a field value
// for one of those breaks its foreign key, so only the ids that actually
// landed get values, history and relations.
export async function persistRecords(
  prisma: PrismaClient,
  batch: RecordBatch
): Promise<Set<string>> {
  await prisma.board.createMany({ data: batch.rows, skipDuplicates: true });

  const landed = await prisma.board.findMany({
    where: { id: { in: batch.rows.map((row) => row.id) } },
    select: { id: true },
  });
  const ids = new Set(landed.map((row) => row.id));

  await prisma.fieldValue.createMany({
    data: batch.values.filter((value) => ids.has(value.recordId)),
    skipDuplicates: true,
  });

  await prisma.history.createMany({
    data: batch.history.filter((entry) => ids.has(entry.recordId)),
  });

  if (batch.relations?.length) {
    await prisma.boardRelation.createMany({
      // Targets were persisted by an earlier batch and already filtered there.
      data: batch.relations.filter((relation) => ids.has(relation.sourceId)),
      skipDuplicates: true,
    });
  }

  return ids;
}
