import { ROLES } from "@dashboard/shared";
import { hashPassword } from "better-auth/crypto";
import { readFileSync } from "fs";
import { v4 as uuidv4 } from "uuid";
import { OnboardingSeeding } from "src/lib/auth/onboarding";
import { resolveModuleId } from "src/lib/module/system-modules";
import { prisma } from "src/lib/prisma/prisma";
import { runWithTenant } from "src/lib/prisma/tenant-context";
import { boardRow } from "./demo/context";

// Throwaway organization for rehearsing the marketing log import on a local
// database. Every name and email is invented; never point this at production.
//
//   pnpm --filter api seed:import-test
//   pnpm --filter api seed:import-test -- --wipe

const SLUG = "import-test-org";
const wipe = process.argv.includes("--wipe");

const USERS = [
  { key: "owner", name: "Test Owner", role: ROLES.OWNER },
  { key: "tracy", name: "Tracy Test", role: ROLES.LIAISON },
  { key: "amy", name: "Amy Test", role: ROLES.LIAISON },
  { key: "rich", name: "Rich Test", role: ROLES.LIAISON },
];

// Near-miss pairs exercise the name matcher: case, punctuation, abbreviations.
const FACILITIES = [
  "Saint Mary's Rehabilitation Center",
  "Lakeside Senior Living",
  "Maple Grove Nursing Home",
  "The Willows Care Center",
  "Riverside Skilled Nursing Facility",
  "Oak Hill Assisted Living",
  "Pine Ridge Health and Rehab",
  "Cedar Point Memory Care",
  "Northview Hospice",
  "Brookfield Manor",
];

// --names=<names.json> swaps the fake facilities for the import's real list.
const namesPath = process.argv.find((a) => a.startsWith("--names="))?.slice(8);
const facilityNames: string[] = namesPath
  ? JSON.parse(readFileSync(namesPath, "utf-8"))
  : FACILITIES;

const emailFor = (key: string) => `${key}.import-test@example.com`;

async function wipeTestOrg() {
  const org = await prisma.organization.findUnique({ where: { slug: SLUG } });
  if (org) await prisma.organization.delete({ where: { id: org.id } });
  await prisma.user.deleteMany({
    where: { email: { in: USERS.map((user) => emailFor(user.key)) } },
  });
  console.log(org ? "Test organization removed." : "Nothing to wipe.");
}

// Lets the test accounts sign in with a password on localhost: a credential
// account per user, an active subscription, and the passkey prompt waived.
async function enableLogin(password: string) {
  const org = await prisma.organization.findUnique({ where: { slug: SLUG } });
  if (!org) throw new Error("Seed the test organization first.");
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");

  const hash = await hashPassword(password);
  const users = await prisma.user.findMany({
    where: { email: { in: USERS.map((user) => emailFor(user.key)) } },
    select: { id: true },
  });
  for (const user of users) {
    await prisma.userAccount.deleteMany({ where: { userId: user.id, providerId: "credential" } });
    await prisma.userAccount.create({
      data: { userId: user.id, accountId: user.id, providerId: "credential", password: hash },
    });
    await prisma.user.update({ where: { id: user.id }, data: { passkeyPromptWaivedAt: new Date() } });
  }

  await prisma.subscription.deleteMany({ where: { referenceId: org.id } });
  await prisma.subscription.create({
    data: { plan: "growth", referenceId: org.id, stripeCustomerId: `cus_import_test_${org.id}`, status: "active" },
  });
  console.log(`Password login enabled for ${users.length} test accounts.`);
}

async function main() {
  if (wipe) return wipeTestOrg();
  const loginPassword = process.argv.find((a) => a.startsWith("--login="))?.slice(8);
  if (loginPassword) return enableLogin(loginPassword);

  if (await prisma.organization.findUnique({ where: { slug: SLUG } })) {
    throw new Error("Test organization already exists. Run with --wipe first.");
  }

  const organizationId = uuidv4();
  const now = new Date();

  await prisma.organization.create({
    data: { id: organizationId, name: "Import Test Org", slug: SLUG, createdAt: now },
  });

  const members: Record<string, { memberId: string; userId: string }> = {};
  for (const user of USERS) {
    const created = await prisma.user.create({
      data: {
        name: user.name,
        email: emailFor(user.key),
        emailVerified: true,
        isActive: true,
        isOnboarded: true,
      },
    });
    const memberId = uuidv4();
    await prisma.member.create({
      data: {
        id: memberId,
        organizationId,
        userId: created.id,
        role: user.role,
        createdAt: now,
      },
    });
    members[user.key] = { memberId, userId: created.id };
  }

  await OnboardingSeeding(organizationId);

  await runWithTenant(organizationId, async () => {
    const moduleId = await resolveModuleId("LEAD", organizationId);
    await prisma.board.createMany({
      data: facilityNames.map((name) =>
        boardRow({
          id: uuidv4(),
          name,
          moduleKey: "LEAD",
          moduleId,
          organizationId,
          assignedTo: members.owner.userId,
          createdAt: now,
        })
      ),
    });
  });

  console.log(`Organization: ${organizationId}`);
  for (const user of USERS) {
    console.log(`${user.key}: member ${members[user.key].memberId}`);
  }
  console.log(`${facilityNames.length} Master List records created.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
