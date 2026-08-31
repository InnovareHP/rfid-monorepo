// Checks the grant matrix against better-auth's real access control engine.
// Lives outside jest because better-auth/plugins/access ships ESM only and the
// API test runner is CJS. Run with: pnpm --filter api verify:permissions
import { createRequire } from "node:module";
import { createAccessControl } from "better-auth/plugins/access";

// The import condition of @dashboard/shared points at .ts source for Vite, so
// the compiled CJS build is loaded instead. Run pnpm build:shared first.
const { DOMAIN_ROLE_PERMISSIONS, DOMAIN_STATEMENT } =
  createRequire(import.meta.url)("@dashboard/shared");

const ac = createAccessControl(DOMAIN_STATEMENT);
const roles = Object.fromEntries(
  Object.entries(DOMAIN_ROLE_PERMISSIONS).map(([name, grants]) => [
    name,
    ac.newRole(grants),
  ])
);

// Every case the frontend already enforces, asserted against the engine.
const cases = [
  ["owner", { billing: ["manage_billing"] }, true],
  ["owner", { record: ["import", "export"] }, true],
  ["owner", { report: ["read", "export"] }, true],
  ["owner", { outreach: ["send"] }, true],
  ["owner", { field: ["configure"] }, true],

  ["admin", { billing: ["manage_billing"] }, false],
  ["admin", { license: ["manage_licenses"] }, false],
  ["admin", { record: ["import"] }, true],
  ["admin", { report: ["read"] }, true],
  ["admin", { outreach: ["send"] }, true],

  ["member", { report: ["read", "export"] }, false],
  ["member", { record: ["create", "read", "update", "delete"] }, true],
  ["member", { record: ["import"] }, false],
  ["member", { record: ["export"] }, false],
  ["member", { outreach: ["send"] }, false],
  ["member", { field: ["configure"] }, false],
  ["member", { billing: ["manage_billing"] }, false],

  ["liason", { record: ["create", "read", "update", "delete"] }, true],
  ["liason", { log: ["create", "read", "update", "delete"] }, true],
  ["liason", { outreach: ["create", "update"] }, true],
  ["liason", { analytics: ["read"] }, true],
  ["liason", { report: ["read"] }, false],
  ["liason", { record: ["import"] }, false],
  ["liason", { record: ["export"] }, false],
  ["liason", { outreach: ["send"] }, false],
  ["liason", { field: ["configure"] }, false],
  ["liason", { billing: ["manage_billing"] }, false],

  // A partially granted resource must fail rather than pass on the granted half.
  ["liason", { record: ["create", "import"] }, false],

  // The task board is open to every role, so the gate only fails closed on an
  // unknown one.
  ["owner", { task: ["create", "read", "update", "delete"] }, true],
  ["admin", { task: ["create", "read", "update", "delete"] }, true],
  ["member", { task: ["create", "read", "update", "delete"] }, true],
  // The one grant that separates member from liaison.
  ["member", { log: ["read"] }, false],
  ["liason", { log: ["read"] }, true],
  ["liason", { task: ["create", "read", "update", "delete"] }, true],
];

let failed = 0;
for (const [role, permission, expected] of cases) {
  const actual = roles[role].authorize(permission).success;
  if (actual !== expected) {
    failed++;
    console.error(
      `FAIL ${role} ${JSON.stringify(permission)} expected ${expected} got ${actual}`
    );
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${cases.length} permission checks failed`);
  process.exit(1);
}

console.log(`${cases.length} permission checks passed`);
