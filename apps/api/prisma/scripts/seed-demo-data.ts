import { PrismaClient } from "@prisma/client";
import { seedActivities } from "./demo/activities";
import { loadContext, resolveOrganization } from "./demo/context";
import { seedCrm } from "./demo/crm";
import { seedFacilities } from "./demo/facilities";
import { seedLiaisonLogs } from "./demo/liaison";
import { resolveProfile } from "./demo/profiles";
import { seedReferrals } from "./demo/referrals";
import { seedTasks } from "./demo/tasks";
import { wipeDemoData } from "./demo/wipe";

// Demo data for a walkthrough, kept out of onboarding on purpose: a real
// organization must not be born holding invented facilities. Run it against a
// throwaway org, never a customer's.
//
//   pnpm --filter api seed:demo -- --org=<organizationId>
//   pnpm --filter api seed:demo -- --org=<organizationId> --wipe
//   pnpm --filter api seed:demo -- --org=<organizationId> --profile=enterprise
//   pnpm --filter api wipe:demo -- --org=<organizationId>
//
// --wipe clears the seeded rows and writes a fresh set. wipe:demo passes
// --wipe-only, which clears them and stops, leaving the org empty of demo data.
//
// Profiles are starter, growth (the default) and enterprise. They change how
// much is written and how far back it reaches, nothing else.
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
const profileArg = process.argv
  .find((arg) => arg.startsWith("--profile="))
  ?.slice("--profile=".length);
const wipeOnly = process.argv.includes("--wipe-only");
const wipe = process.argv.includes("--wipe");

async function main() {
  if (wipeOnly) {
    const organization = await resolveOrganization(prisma, orgArg);

    console.log(
      `Wiping demo data from ${organization.name} (${organization.id})`
    );

    await wipeDemoData(prisma, organization.id);
    return;
  }

  const profile = resolveProfile(profileArg);
  const ctx = await loadContext(prisma, profile, orgArg);

  console.log(
    `Seeding ${profile.key} demo data into ${ctx.organizationName} ` +
      `(${ctx.organizationId})`
  );

  if (wipe) await wipeDemoData(prisma, ctx.organizationId);

  // Order is the link order: a contact needs its company, a facility needs its
  // contacts, and a referral needs its facility.
  const { companies, contacts } = await seedCrm(prisma, ctx);
  const facilities = await seedFacilities(prisma, ctx, contacts);
  const referrals = await seedReferrals(prisma, ctx, facilities);
  const logs = await seedLiaisonLogs(prisma, ctx, facilities);
  // After the visit logs on purpose: every one of them gets the activity the
  // app would have mirrored, so this step has to see them already written.
  const activities = await seedActivities(prisma, ctx, facilities, contacts);
  const tasks = await seedTasks(prisma, ctx);

  console.log(`\n${profile.key} demo data ready.`);
  console.log(`  Companies         ${companies.length}`);
  console.log(`  Contacts          ${contacts.length}`);
  console.log(`  Facilities        ${facilities.length}`);
  console.log(`  Referrals         ${referrals}`);
  console.log(`  Visit logs        ${logs.visits}`);
  console.log(`  Expenses          ${logs.expenses}`);
  console.log(`  Mileage entries   ${logs.trips}`);
  console.log(`  Activities        ${activities.mirrored + activities.logged}`);
  console.log(`  Open follow-ups   ${activities.followUps}`);
  console.log(`  Overdue of those  ${activities.overdue}`);
  console.log(`  Email opens       ${activities.opens}`);
  console.log(`  Tasks             ${tasks}`);
  console.log(`  Assigned across   ${ctx.assignable.length} member(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
