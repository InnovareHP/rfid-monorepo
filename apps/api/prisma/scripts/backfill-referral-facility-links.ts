import { Prisma, PrismaClient, RelationType } from "@prisma/client";
import { decryptNullable } from "../../src/lib/crypto/crypto";
import { recordNameIndexes } from "../../src/lib/crypto/record-name-index";

// Every facility-shaped report reads BoardRelation, not the Facility field, so
// a referral with a Facility value but no relation is invisible to all of them:
// Top Referring Facilities, Top Counties, Emerging Sources, the Scorecard.
//
// Imports before the link fix dropped a Facility cell it could not resolve, so
// there are two populations and they need different answers:
//
//   value present, no relation  -> repairable here
//   no value at all             -> nothing to repair; re-import or fill it in
//
//   pnpm --filter api backfill:facility-links -- --org=<organizationId>
//   pnpm --filter api backfill:facility-links -- --org=<organizationId> --apply
//   pnpm --filter api backfill:facility-links -- --org=<organizationId> --explain

const prisma = new PrismaClient();

const orgArg = process.argv
  .find((arg) => arg.startsWith("--org="))
  ?.slice("--org=".length);
const apply = process.argv.includes("--apply");
const explain = process.argv.includes("--explain");

const RELATION = RelationType.REFERRAL_LINK;

async function main() {
  const organizationId =
    orgArg ??
    (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }))
      ?.id;

  if (!organizationId) {
    throw new Error("Pass --org=<organizationId>");
  }

  const facilityField = await prisma.field.findFirst({
    where: {
      organizationId,
      moduleType: "REFERRAL",
      fieldType: "REFERRAL_LINK",
      isDeleted: false,
    },
    select: { id: true, fieldName: true },
  });

  if (!facilityField) {
    throw new Error(
      "This organization has no REFERRAL_LINK field on the referral module, so referrals were never meant to link to facilities."
    );
  }

  const [referrals, facilities, existing] = await Promise.all([
    prisma.board.findMany({
      where: { organizationId, moduleType: "REFERRAL", isDeleted: false },
      select: {
        id: true,
        values: {
          where: { fieldId: facilityField.id },
          select: { value: true },
        },
      },
    }),
    prisma.board.findMany({
      where: { organizationId, moduleType: "LEAD", isDeleted: false },
      select: {
        id: true,
        recordName: true,
        recordNameHash: true,
        recordNameFuzzyHash: true,
      },
    }),
    // Deliberately not filtered on the relation's own organizationId: a null
    // one is the case this repairs, and filtering would hide it. Scoped through
    // the source record instead. This script uses a raw client, so no tenant
    // extension is injecting that filter either.
    prisma.boardRelation.findMany({
      where: {
        relationType: RelationType.REFERRAL_LINK,
        source: { organizationId, moduleType: "REFERRAL" },
      },
      select: { id: true, sourceId: true, organizationId: true },
    }),
  ]);

  const linked = new Set(existing.map((relation) => relation.sourceId));

  // BoardRelation.organizationId is nullable and the table is tenant-scoped, so
  // a null makes the row invisible to every analytics read while the referral
  // still shows its facility - that renders from the field value, not the
  // relation. Rows predating the column carry null, and an insert cannot fix
  // them: the unique key already matches, so skipDuplicates skips them.
  const orphaned = existing.filter((relation) => !relation.organizationId);
  const facilityIds = new Set(facilities.map((facility) => facility.id));
  const byHash = new Map(
    facilities
      .filter((facility) => facility.recordNameHash)
      .map((facility) => [facility.recordNameHash as string, facility.id])
  );
  const byFuzzy = new Map(
    facilities
      .filter((facility) => facility.recordNameFuzzyHash)
      .map((facility) => [facility.recordNameFuzzyHash as string, facility.id])
  );

  const repairable: { sourceId: string; targetId: string }[] = [];
  const unresolved: string[] = [];
  let alreadyLinked = 0;
  let noValue = 0;

  for (const referral of referrals) {
    if (linked.has(referral.id)) {
      alreadyLinked += 1;
      continue;
    }

    // The column holds a facility id once linked, and whatever the spreadsheet
    // said before that.
    const raw = decryptNullable(referral.values[0]?.value ?? null);

    if (!raw?.trim()) {
      noValue += 1;
      continue;
    }

    if (facilityIds.has(raw)) {
      repairable.push({ sourceId: referral.id, targetId: raw });
      continue;
    }

    const { recordNameHash, recordNameFuzzyHash } = recordNameIndexes(raw);
    const targetId =
      (recordNameHash ? byHash.get(recordNameHash) : undefined) ??
      (recordNameFuzzyHash ? byFuzzy.get(recordNameFuzzyHash) : undefined);

    if (targetId) {
      repairable.push({ sourceId: referral.id, targetId });
    } else {
      unresolved.push(raw);
    }
  }

  console.log(`Organization      ${organizationId}`);
  console.log(`Link field        "${facilityField.fieldName}"`);
  console.log(`Referrals         ${referrals.length}`);
  console.log(`Facilities        ${facilities.length}`);
  console.log(`Already linked    ${alreadyLinked}`);
  console.log(
    `Missing org id    ${orphaned.length}  <- linked but invisible to analytics`
  );
  console.log(`Repairable        ${repairable.length}`);
  console.log(`No value at all   ${noValue}`);
  console.log(`Named, unmatched  ${unresolved.length}`);

  if (unresolved.length) {
    const sample = [...new Set(unresolved)].slice(0, 15);
    console.log("\nNames that match no facility:");
    for (const name of sample) console.log(`  ${name}`);
    console.log(
      "  Create these facilities, or correct the spelling, then re-run."
    );
  }

  if (noValue === referrals.length && referrals.length) {
    console.log(
      "\nEvery referral is missing its facility value, so there is nothing to"
    );
    console.log(
      "recover from the database. Re-import with the facility column mapped,"
    );
    console.log("or set the field on the records.");
  }

  // Narrows exactly the way fetchReferralLinkedLeads does, one condition at a
  // time, so the count that drops to zero names the reason the analytics are
  // empty. Runs on this script's own connection, which also rules out having
  // queried a different database by hand.
  if (explain) {
    const steps: [string, Prisma.BoardRelationWhereInput][] = [
      ["REFERRAL_LINK relations, unfiltered", { relationType: RELATION }],
      [
        "+ source is a referral in this org",
        {
          relationType: RELATION,
          source: { organizationId, moduleType: "REFERRAL", isDeleted: false },
        },
      ],
      [
        "+ target is a lead, not deleted",
        {
          relationType: RELATION,
          source: { organizationId, moduleType: "REFERRAL", isDeleted: false },
          target: { moduleType: "LEAD", isDeleted: false },
        },
      ],
      [
        "+ relation carries this organization",
        {
          relationType: RELATION,
          organizationId,
          source: { organizationId, moduleType: "REFERRAL", isDeleted: false },
          target: { moduleType: "LEAD", isDeleted: false },
        },
      ],
    ];

    console.log("\nWhat the analytics query sees:");
    for (const [label, where] of steps) {
      console.log(`  ${String(await prisma.boardRelation.count({ where })).padStart(6)}  ${label}`);
    }

    const targets = await prisma.boardRelation.findMany({
      where: { relationType: RELATION, source: { organizationId } },
      select: { target: { select: { moduleType: true, moduleId: true } } },
    });
    const byModule = new Map<string, number>();
    for (const row of targets) {
      const key = `${row.target.moduleType}/${row.target.moduleId ?? "no moduleId"}`;
      byModule.set(key, (byModule.get(key) ?? 0) + 1);
    }
    console.log("\n  Link targets by module:");
    for (const [key, count] of byModule) {
      console.log(`    ${String(count).padStart(6)}  ${key}`);
    }

    const span = await prisma.board.aggregate({
      where: { organizationId, moduleType: "REFERRAL", isDeleted: false },
      _min: { createdAt: true },
      _max: { createdAt: true },
    });
    console.log(
      `\n  Referral dates: ${span._min.createdAt?.toISOString() ?? "none"} to ${span._max.createdAt?.toISOString() ?? "none"}`
    );
    console.log("  Compare that against the dashboard's date range.");
    return;
  }

  if (!apply) {
    console.log("\nDry run. Pass --apply to write the links.");
    return;
  }

  if (orphaned.length) {
    const fixed = await prisma.boardRelation.updateMany({
      where: { id: { in: orphaned.map((relation) => relation.id) } },
      data: { organizationId },
    });
    console.log(`Stamped ${fixed.count} relation(s) with the organization.`);
  }

  if (!repairable.length) {
    console.log("No new relations to write.");
    return;
  }

  const written = await prisma.boardRelation.createMany({
    data: repairable.map((link) => ({
      sourceId: link.sourceId,
      targetId: link.targetId,
      relationType: RelationType.REFERRAL_LINK,
      organizationId,
    })),
    skipDuplicates: true,
  });

  // The value column should hold the id once a relation exists, matching what
  // the update path writes.
  for (const link of repairable) {
    await prisma.fieldValue.updateMany({
      where: { recordId: link.sourceId, fieldId: facilityField.id },
      data: { value: link.targetId },
    });
  }

  console.log(`\nWrote ${written.count} relation(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
