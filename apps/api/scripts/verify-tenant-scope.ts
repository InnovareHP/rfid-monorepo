import { prisma } from "../src/lib/prisma/prisma";
import { runUnscoped, runWithTenant } from "../src/lib/prisma/tenant-context";

// Exercises the real extended client. What is asserted is whether the guard
// blocked the call, not whether a database answered it, so the script gives the
// same result against a reachable and an unreachable DATABASE_URL.
const checks: [string, () => Promise<unknown>, "blocked" | "allowed"][] = [
  ["scoped read with no context", () => prisma.board.findMany(), "blocked"],
  [
    "scoped write with no context",
    () => prisma.field.create({ data: {} as never }),
    "blocked",
  ],
  [
    "scoped read inside a tenant",
    () => runWithTenant("org_a", () => prisma.board.findMany()),
    "allowed",
  ],
  [
    "scoped read inside the escape hatch",
    () => runUnscoped(() => prisma.board.findMany()),
    "allowed",
  ],
  ["unscoped model with no context", () => prisma.user.findMany(), "allowed"],
];

async function main() {
  let failed = 0;

  for (const [name, run, expected] of checks) {
    let outcome: string;
    try {
      await run();
      outcome = "allowed";
    } catch (error) {
      // Anything other than the guard's own error means the call got past it.
      outcome =
        error instanceof Error && error.name === "TenantScopeError"
          ? "blocked"
          : "allowed";
    }

    const ok = outcome === expected;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name.padEnd(36)} ${outcome}`);
  }

  // A probe added after the tenant extension sits inside it, so the args it
  // receives are the ones the engine would have been handed.
  let where: Record<string, unknown> | undefined;

  const probe = prisma.$extends({
    query: {
      board: {
        findMany({ args }) {
          where = args.where as Record<string, unknown>;
          return Promise.resolve([]);
        },
      },
    },
  });

  await runWithTenant("org_a", async () => {
    await probe.board.findMany({ where: { isDeleted: false } });
  });
  const scoped = where?.organizationId === "org_a";
  if (!scoped) failed++;
  console.log(
    `${scoped ? "PASS" : "FAIL"}  ${"args handed to the engine".padEnd(36)} ${JSON.stringify(where)}`
  );

  await prisma.$disconnect().catch(() => undefined);

  if (failed > 0) {
    console.error(`\n${failed} tenant scope checks failed`);
    process.exit(1);
  }
  console.log(`\n${checks.length + 1} tenant scope checks passed`);
}

void main();
