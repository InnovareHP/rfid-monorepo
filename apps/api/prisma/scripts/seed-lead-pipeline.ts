import { BoardFieldType, PrismaClient, StageType } from "@prisma/client";

// Adds the lead pipeline stage and deal value fields to organizations created
// before the pipeline feature, then seeds default stages and points the
// pipeline config at them. Existing pipeline config is left alone.

const raw = new PrismaClient();

const STAGE_FIELD = "Pipeline Stage";
const AMOUNT_FIELD = "Deal Value";

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

async function ensureField(
  organizationId: string,
  fieldName: string,
  fieldType: BoardFieldType,
  fieldOrder: number
) {
  const existing = await raw.field.findFirst({
    where: { organizationId, moduleType: "LEAD", fieldName, isDeleted: false },
  });

  if (existing) return existing;

  return raw.field.create({
    data: { organizationId, moduleType: "LEAD", fieldName, fieldType, fieldOrder },
  });
}

async function run() {
  const organizations = await raw.organization.findMany({ select: { id: true } });

  let configured = 0;
  let skipped = 0;

  for (const organization of organizations) {
    const alreadyConfigured = await raw.field.findFirst({
      where: {
        organizationId: organization.id,
        moduleType: "LEAD",
        isPipelineStage: true,
        isDeleted: false,
      },
    });

    if (alreadyConfigured) {
      skipped++;
      continue;
    }

    const maxOrder = await raw.field.aggregate({
      where: { organizationId: organization.id, moduleType: "LEAD" },
      _max: { fieldOrder: true },
    });
    const nextOrder = (maxOrder._max.fieldOrder ?? 0) + 1;

    const stageField = await ensureField(
      organization.id,
      STAGE_FIELD,
      BoardFieldType.STATUS,
      nextOrder
    );
    const amountField = await ensureField(
      organization.id,
      AMOUNT_FIELD,
      BoardFieldType.NUMBER,
      nextOrder + 1
    );

    const optionCount = await raw.fieldOption.count({
      where: { fieldId: stageField.id, isDeleted: false },
    });

    if (!optionCount) {
      await raw.fieldOption.createMany({
        data: DEFAULT_STAGES.map((stage, index) => ({
          fieldId: stageField.id,
          optionName: stage.name,
          color: stage.color,
          optionOrder: index,
          stageType: stage.stageType,
          probability: stage.probability,
        })),
      });
    }

    await raw.$transaction([
      raw.field.update({
        where: { id: stageField.id },
        data: { isPipelineStage: true },
      }),
      raw.field.update({
        where: { id: amountField.id },
        data: { isPipelineAmount: true },
      }),
    ]);

    configured++;
  }

  console.log(
    `Configured ${configured} organizations; skipped ${skipped} that already had a pipeline stage field`
  );
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());
