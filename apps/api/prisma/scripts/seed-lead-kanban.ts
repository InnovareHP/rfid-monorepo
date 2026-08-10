import { BoardFieldType, PrismaClient, StageType } from "@prisma/client";

// Moves organizations onto the status-driven Kanban: renames the old "Pipeline
// Stage" field to "Status", retires "Deal Value", and seeds default stages on
// any lead module that has no STATUS field yet. Deal Value is soft-deleted, so
// its recorded values stay in FieldValue and can be brought back.

const raw = new PrismaClient();

const LEGACY_STAGE_FIELD = "Pipeline Stage";
const LEGACY_AMOUNT_FIELD = "Deal Value";
const STATUS_FIELD = "Status";

const DEFAULT_STAGES = [
  { name: "New", color: "#3b82f6", stageType: StageType.OPEN, probability: 10 },
  {
    name: "Contacted",
    color: "#6366f1",
    stageType: StageType.OPEN,
    probability: 25,
  },
  {
    name: "Qualified",
    color: "#eab308",
    stageType: StageType.OPEN,
    probability: 50,
  },
  {
    name: "Proposal",
    color: "#f97316",
    stageType: StageType.OPEN,
    probability: 75,
  },
  { name: "Won", color: "#22c55e", stageType: StageType.WON, probability: null },
  {
    name: "Lost",
    color: "#ef4444",
    stageType: StageType.LOST,
    probability: null,
  },
];

async function resolveStatusField(organizationId: string) {
  const existing = await raw.field.findFirst({
    where: {
      organizationId,
      moduleType: "LEAD",
      fieldType: BoardFieldType.STATUS,
      isDeleted: false,
    },
    orderBy: { fieldOrder: "asc" },
  });

  // Renaming keeps every stage option and every recorded value in place.
  if (existing) {
    if (existing.fieldName === LEGACY_STAGE_FIELD) {
      return raw.field.update({
        where: { id: existing.id },
        data: { fieldName: STATUS_FIELD },
      });
    }
    return existing;
  }

  const maxOrder = await raw.field.aggregate({
    where: { organizationId, moduleType: "LEAD" },
    _max: { fieldOrder: true },
  });

  return raw.field.create({
    data: {
      organizationId,
      moduleType: "LEAD",
      fieldName: STATUS_FIELD,
      fieldType: BoardFieldType.STATUS,
      fieldOrder: (maxOrder._max.fieldOrder ?? 0) + 1,
    },
  });
}

async function run() {
  const organizations = await raw.organization.findMany({
    select: { id: true },
  });

  let renamed = 0;
  let created = 0;
  let staged = 0;
  let retired = 0;

  for (const organization of organizations) {
    const before = await raw.field.findFirst({
      where: {
        organizationId: organization.id,
        moduleType: "LEAD",
        fieldType: BoardFieldType.STATUS,
        isDeleted: false,
      },
      orderBy: { fieldOrder: "asc" },
      select: { fieldName: true },
    });

    const statusField = await resolveStatusField(organization.id);

    if (!before) created++;
    else if (before.fieldName === LEGACY_STAGE_FIELD) renamed++;

    const optionCount = await raw.fieldOption.count({
      where: { fieldId: statusField.id, isDeleted: false },
    });

    if (!optionCount) {
      await raw.fieldOption.createMany({
        data: DEFAULT_STAGES.map((stage, index) => ({
          fieldId: statusField.id,
          optionName: stage.name,
          color: stage.color,
          optionOrder: index,
          stageType: stage.stageType,
          probability: stage.probability,
        })),
      });
      staged++;
    }

    const amountRetired = await raw.field.updateMany({
      where: {
        organizationId: organization.id,
        moduleType: "LEAD",
        fieldName: LEGACY_AMOUNT_FIELD,
        isDeleted: false,
      },
      data: { isDeleted: true },
    });
    retired += amountRetired.count;
  }

  console.log(
    `Renamed ${renamed}, created ${created}, seeded stages for ${staged}, retired ${retired} Deal Value field(s) across ${organizations.length} organizations`
  );
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());
