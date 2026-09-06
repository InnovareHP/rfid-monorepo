import { PrismaClient } from "@prisma/client";
import { loadContext } from "./demo/context";
import { seedCrm } from "./demo/crm";
import { seedFacilities } from "./demo/facilities";
import { seedLiaisonLogs } from "./demo/liaison";
import { seedReferrals } from "./demo/referrals";
import { seedTasks } from "./demo/tasks";
import { wipeDemoData } from "./demo/wipe";

// Demo data for a walkthrough, kept out of onboarding on purpose: a real
// organization must not be born holding invented facilities. Run it against a
// throwaway org, never a customer's.
//
//   pnpm --filter api seed:demo -- --org=<organizationId>
//   pnpm --filter api seed:demo -- --org=<organizationId> --wipe
//
// Every record is written with the same encryption and blind indexes the app
// writes, so search, duplicate detection and analytics behave as they would on
// real data rather than on rows only this script could produce.
//
// Onboarding has to have run first: the modules, fields and field options come
// from there, and task statuses come from seed:task-statuses.

const prisma = new PrismaClient();

const orgArg = process.argv
  .find((arg) => arg.startsWith("--org="))
  ?.slice("--org=".length);
const wipe = process.argv.includes("--wipe");

async function main() {
  const ctx = await loadContext(prisma, orgArg);

  console.log(
    `Seeding demo data into ${ctx.organizationName} (${ctx.organizationId})`
  );

  if (wipe) await wipeDemoData(prisma, ctx.organizationId);

  // Order is the link order: a contact needs its company, a facility needs its
  // contacts, and a referral needs its facility.
  const { companies, contacts } = await seedCrm(prisma, ctx);
  const facilities = await seedFacilities(prisma, ctx, contacts);
  const referrals = await seedReferrals(prisma, ctx, facilities, contacts);
  const logs = await seedLiaisonLogs(prisma, ctx, facilities);
  const tasks = await seedTasks(prisma, ctx);

  console.log("\nDemo data ready.");
  console.log(`  Companies         ${companies.length}`);
  console.log(`  Contacts          ${contacts.length}`);
  console.log(`  Facilities        ${facilities.length}`);
  console.log(`  Referrals         ${referrals}`);
  console.log(`  Visit logs        ${logs.visits}`);
  console.log(`  Expenses          ${logs.expenses}`);
  console.log(`  Mileage entries   ${logs.trips}`);
  console.log(`  Tasks             ${tasks}`);
  console.log(`  Assigned across   ${ctx.assignable.length} member(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
