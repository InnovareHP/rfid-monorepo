import { prisma } from "../src/lib/prisma/prisma";
import { recordNameIndexes } from "../src/lib/crypto/record-name-index";
import { runUnscoped } from "../src/lib/prisma/tenant-context";

// The blind index is an HMAC computed in application code, so existing rows
// cannot be filled in by SQL - the key never reaches the database. This walks
// every record once and writes both hashes.
//
// Idempotent: re-running recomputes the same values. Safe to run before the
// unique index exists, which is the point.
//
// Usage: pnpm --filter api backfill:record-name-hash [--force]

const FORCE = process.argv.includes("--force");
const BATCH = 500;

async function main() {
  let processed = 0;
  let written = 0;
  let cursor: string | undefined;

  for (;;) {
    const records = await runUnscoped(() =>
      prisma.board.findMany({
        where: FORCE ? {} : { recordNameHash: null },
        select: { id: true, recordName: true },
        orderBy: { id: "asc" },
        take: BATCH,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      })
    );

    if (records.length === 0) break;

    for (const record of records) {
      const indexes = recordNameIndexes(record.recordName);
      processed += 1;

      // A blank name has no identity to index, so it is left null rather than
      // collapsing every unnamed record onto one hash.
      if (!indexes.recordNameHash) continue;

      await runUnscoped(() =>
        prisma.board.update({ where: { id: record.id }, data: indexes })
      );
      written += 1;
    }

    cursor = records[records.length - 1].id;
    console.log(`  ${processed} scanned, ${written} hashed`);
  }

  console.log(`\nDone. ${processed} record(s) scanned, ${written} hashed.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
