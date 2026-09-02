import { seedDefaultAnalytics } from "../../src/lib/analytics/default-analytics";
import { prisma } from "../../src/lib/prisma/prisma";
import {
  runUnscoped,
  runWithTenant,
} from "../../src/lib/prisma/tenant-context";

// Organizations created before module-scoped analytics have no default
// dashboard, so the referral and master marketing pages had nothing to resolve.
// seedDefaultAnalytics is idempotent, so a rerun only fills the gaps.
// --force replaces a default dashboard that already exists, which is how a
// changed default chart set reaches organizations seeded before the change.
// Charts added to that page by hand go with it.
const force = process.argv.includes("--force");

async function main() {
  // Listing every organization is the one query that is deliberately not
  // tenant-scoped; everything below runs inside the organization it touches.
  const organizations = await runUnscoped(() =>
    prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    })
  );

  let seeded = 0;
  let skipped = 0;

  for (const organization of organizations) {
    await runWithTenant(organization.id, async () => {
      const modules = await prisma.module.findMany({
        where: { organizationId: organization.id, isArchived: false },
        select: { id: true, key: true },
        orderBy: { moduleOrder: "asc" },
      });

      for (const module of modules) {
        const existing = await prisma.customAnalyticDashboard.findFirst({
          where: {
            organizationId: organization.id,
            moduleId: module.id,
            isDefault: true,
          },
          select: { id: true },
        });

        if (existing && !force) {
          skipped += 1;
          continue;
        }

        if (existing) {
          // CustomAnalytic.dashboardId is SetNull on delete, so the old charts
          // would survive as loose saved charts if they were not removed first.
          await prisma.customAnalytic.deleteMany({
            where: { organizationId: organization.id, dashboardId: existing.id },
          });
          await prisma.customAnalyticDashboard.delete({
            where: { id: existing.id },
          });
        }

        const dashboard = await seedDefaultAnalytics(
          module.id,
          organization.id
        );

        // A module whose fields do not support any default chart seeds nothing,
        // which is a normal outcome for a bare custom module.
        if (!dashboard) {
          console.log(`  ${organization.name}/${module.key}: no chart applies`);
          continue;
        }

        seeded += 1;
        console.log(`  ${organization.name}/${module.key}: seeded`);
      }
    });
  }

  console.log(
    `Done. ${seeded} dashboards seeded, ${skipped} already had one, across ${organizations.length} organizations${force ? " (forced)" : ""}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
