import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The referral County dropdown used to read BoardCounty rows. It now reads
// FieldOption like every other dropdown, so configured counties move across.
async function main() {
  const counties = await prisma.boardCounty.findMany({
    select: { countyName: true, organizationId: true },
  });

  if (counties.length === 0) {
    console.log("No BoardCounty rows to backfill");
    return;
  }

  const fields = await prisma.field.findMany({
    where: { fieldName: "County", moduleType: "REFERRAL", isDeleted: false },
    select: { id: true, organizationId: true },
  });

  const fieldByOrg = new Map(fields.map((f) => [f.organizationId, f.id]));

  const data = counties
    .map((county) => {
      const fieldId = fieldByOrg.get(county.organizationId);
      if (!fieldId) return null;
      return {
        fieldId,
        optionName: county.countyName,
        organizationId: county.organizationId,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const existing = await prisma.fieldOption.findMany({
    where: { fieldId: { in: [...fieldByOrg.values()] }, isDeleted: false },
    select: { fieldId: true, optionName: true },
  });

  const seen = new Set(existing.map((o) => `${o.fieldId}:${o.optionName}`));
  const rows = data.filter(
    (row) => !seen.has(`${row.fieldId}:${row.optionName}`)
  );

  if (rows.length === 0) {
    console.log("Every county already exists as a field option");
    return;
  }

  const result = await prisma.fieldOption.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(`Created ${result.count} referral county options`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
