import type { Prisma, PrismaClient } from "@prisma/client";
import {
  CLINICIANS,
  COUNTIES,
  EXPENSE_DESCRIPTIONS,
  EXPENSE_NOTES,
  MILEAGE_DESTINATIONS,
  TOUCHPOINTS,
  VISIT_REASONS,
} from "./catalog";
import type { DemoContext } from "./context";
import type { DemoFacility } from "./facilities";
import { between, daysAgo, pick, random } from "./random";

const VISIT_COUNT = 180;
const EXPENSE_COUNT = 60;
const MILEAGE_COUNT = 70;

const RATES = { FEDERAL: 0.67, STATE: 0.39 } as const;

export async function seedLiaisonLogs(
  prisma: PrismaClient,
  ctx: DemoContext,
  facilities: DemoFacility[]
): Promise<{ visits: number; expenses: number; trips: number }> {
  const { organizationId } = ctx;

  // The Analyze dialog reads these, and it matches on the facility name, so the
  // names written here are the facility names verbatim.
  const marketing: Prisma.MarketingCreateManyInput[] = [];

  for (let index = 0; index < VISIT_COUNT; index += 1) {
    const facility = facilities[between(0, facilities.length - 1)];
    const member = pick(ctx.assignable);

    marketing.push({
      facility: facility.name,
      touchpoints: Array.from({ length: between(1, 2) }, () =>
        pick(TOUCHPOINTS)
      ),
      talkedTo: pick(CLINICIANS),
      reasonForVisit: pick(VISIT_REASONS),
      notes: pick(VISIT_REASONS),
      memberId: member.id,
      // Liaison analytics key every map by user id, so a log without one is
      // invisible to the per-liaison reports it is supposed to feed.
      userId: member.userId,
      organizationId,
      facilityRecordId: facility.id,
      createdAt: daysAgo(between(1, 300)),
    });
  }

  const expenses: Prisma.ExpenseCreateManyInput[] = [];

  for (let index = 0; index < EXPENSE_COUNT; index += 1) {
    const member = pick(ctx.assignable);

    expenses.push({
      amount: Number((random() * 180 + 8).toFixed(2)),
      description: pick(EXPENSE_DESCRIPTIONS),
      notes: pick(EXPENSE_NOTES),
      // No receipt is uploaded for demo rows, which is the state the missing
      // receipt count already reports on rather than a broken image link.
      imageUrl: "",
      memberId: member.id,
      userId: member.userId,
      organizationId,
      createdAt: daysAgo(between(1, 300)),
    });
  }

  const mileage: Prisma.MileageCreateManyInput[] = [];

  for (let index = 0; index < MILEAGE_COUNT; index += 1) {
    const member = pick(ctx.assignable);
    const beginningMileage = between(8000, 42000);
    const totalMiles = between(12, 180);
    const rateType = random() < 0.7 ? "FEDERAL" : "STATE";
    const ratePerMile = RATES[rateType];

    mileage.push({
      destination: pick(MILEAGE_DESTINATIONS),
      countiesMarketed: `${pick(COUNTIES)}, ${pick(COUNTIES)}`,
      beginningMileage,
      endingMileage: beginningMileage + totalMiles,
      totalMiles,
      rateType,
      ratePerMile,
      reimbursementAmount: Number((totalMiles * ratePerMile).toFixed(2)),
      memberId: member.id,
      userId: member.userId,
      organizationId,
      createdAt: daysAgo(between(1, 300)),
    });
  }

  await prisma.marketing.createMany({ data: marketing });
  await prisma.expense.createMany({ data: expenses });
  await prisma.mileage.createMany({ data: mileage });

  console.log(
    `Created ${marketing.length} visit logs, ${expenses.length} expenses, ` +
      `${mileage.length} mileage entries`
  );

  return {
    visits: marketing.length,
    expenses: expenses.length,
    trips: mileage.length,
  };
}
