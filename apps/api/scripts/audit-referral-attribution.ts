import { prisma } from "../src/lib/prisma/prisma";

// The Marketing Report credits a referral to a liaison through the facility
// they logged a visit against: Marketing.facilityRecordId -> BoardRelation
// REFERRAL_LINK -> the referral. A zero on that report means the chain is
// broken somewhere, so this reports where. Counts only, never record content.
//
// Usage: pnpm --filter api audit:referral-attribution <organizationId>

const [organizationId] = process.argv.slice(2);

async function main() {
  if (!organizationId) {
    throw new Error("Usage: audit:referral-attribution <organizationId>");
  }

  const [logs, logsWithoutFacility, referrals, links] = await Promise.all([
    prisma.marketing.count({
      where: { isDeleted: false, member: { organizationId } },
    }),
    prisma.marketing.count({
      where: {
        isDeleted: false,
        member: { organizationId },
        facilityRecordId: null,
      },
    }),
    prisma.board.count({
      where: { organizationId, moduleType: "REFERRAL", isDeleted: false },
    }),
    prisma.boardRelation.findMany({
      where: {
        relationType: "REFERRAL_LINK",
        source: { organizationId, moduleType: "REFERRAL", isDeleted: false },
      },
      select: { sourceId: true, targetId: true },
    }),
  ]);

  const visitedFacilityIds = new Set(
    (
      await prisma.marketing.findMany({
        where: {
          isDeleted: false,
          member: { organizationId },
          facilityRecordId: { not: null },
        },
        select: { facilityRecordId: true },
        distinct: ["facilityRecordId"],
      })
    ).map((row) => row.facilityRecordId as string)
  );

  const linkedReferralIds = new Set(links.map((link) => link.sourceId));
  const attributed = links.filter((link) =>
    visitedFacilityIds.has(link.targetId)
  );

  console.log(`Organization:                       ${organizationId}`);
  console.log(`Marketing logs:                     ${logs}`);
  console.log(`  without a facility record:        ${logsWithoutFacility}`);
  console.log(`  distinct facilities visited:      ${visitedFacilityIds.size}`);
  console.log(`Referrals:                          ${referrals}`);
  console.log(`  with a Facility link:             ${linkedReferralIds.size}`);
  console.log(`  without a Facility link:          ${referrals - linkedReferralIds.size}`);
  console.log(`  linked to a visited facility:     ${new Set(attributed.map((l) => l.sourceId)).size}`);
  console.log("");

  if (referrals > 0 && linkedReferralIds.size === 0) {
    console.log("Cause: no referral has a Facility link, so nothing can be attributed.");
  } else if (visitedFacilityIds.size === 0) {
    console.log("Cause: no marketing log carries a facility record to join on.");
  } else if (attributed.length === 0) {
    console.log(
      "Cause: referrals are linked, but to facilities no outreach was logged against."
    );
  } else {
    console.log("Chain is intact; a zero on the report is a date-filter effect.");
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
