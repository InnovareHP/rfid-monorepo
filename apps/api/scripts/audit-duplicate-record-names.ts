import { prisma } from "../src/lib/prisma/prisma";
import { runUnscoped } from "../src/lib/prisma/tenant-context";

// Lists the duplicate groups the unique index would refuse to build over, plus
// the near matches it would allow through. Run after the backfill and before
// applying add_record_name_uniqueness.
//
// Names are printed because the operator has to decide which row to keep, and
// they already have access to these records. Nothing is written or deleted.
//
// Usage: pnpm --filter api audit:duplicate-record-names [organizationId]

const [organizationId] = process.argv.slice(2);

type Group = {
  moduleType: string;
  moduleId: string | null;
  ids: string[];
  names: string[];
};

const collect = (
  records: {
    id: string;
    recordName: string;
    moduleType: string;
    moduleId: string | null;
    organizationId: string;
    recordNameHash: string | null;
    recordNameFuzzyHash: string | null;
  }[],
  key: "recordNameHash" | "recordNameFuzzyHash"
) => {
  const groups = new Map<string, Group>();

  for (const record of records) {
    const hash = record[key];
    if (!hash) continue;

    const groupKey = `${record.organizationId}:${record.moduleId ?? ""}:${hash}`;
    const group = groups.get(groupKey) ?? {
      moduleType: record.moduleType,
      moduleId: record.moduleId,
      ids: [],
      names: [],
    };

    group.ids.push(record.id);
    group.names.push(record.recordName);
    groups.set(groupKey, group);
  }

  return [...groups.values()].filter((group) => group.ids.length > 1);
};

async function main() {
  const records = await runUnscoped(() =>
    prisma.board.findMany({
      where: {
        isDeleted: false,
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        recordName: true,
        moduleType: true,
        moduleId: true,
        organizationId: true,
        recordNameHash: true,
        recordNameFuzzyHash: true,
      },
    })
  );

  const unhashed = records.filter((record) => !record.recordNameHash).length;
  if (unhashed > 0) {
    console.log(
      `${unhashed} record(s) have no hash yet - run backfill:record-name-hash first.\n`
    );
  }

  const exact = collect(records, "recordNameHash");
  // The account modules are the ones the unique index covers.
  const blocking = exact.filter((group) => group.moduleType !== "REFERRAL");

  console.log(`Exact duplicate groups:        ${exact.length}`);
  console.log(`  blocking the unique index:   ${blocking.length}`);

  for (const group of blocking) {
    console.log(`\n  [${group.moduleType}] ${group.names[0]}`);
    for (const id of group.ids) console.log(`    ${id}`);
  }

  const fuzzy = collect(records, "recordNameFuzzyHash").filter(
    (group) => new Set(group.names.map((name) => name.trim())).size > 1
  );

  console.log(`\nNear-match groups (flagged, not blocked): ${fuzzy.length}`);
  for (const group of fuzzy.slice(0, 50)) {
    console.log(`  [${group.moduleType}] ${group.names.join("  |  ")}`);
  }

  if (blocking.length > 0) {
    console.log(
      "\nResolve the blocking groups before applying add_record_name_uniqueness."
    );
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
