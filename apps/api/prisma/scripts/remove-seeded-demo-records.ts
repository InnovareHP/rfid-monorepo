import { ModuleType, PrismaClient } from "@prisma/client";
import { decryptNullable } from "../../src/lib/crypto/crypto";
import { emailIndex } from "../../src/lib/crypto/email-index";

const prisma = new PrismaClient();

// Every organization created before the seed stopped planting sample records
// carries these. They are indistinguishable from real data in the UI, they
// count in analytics, and they seeded duplicate phone numbers across modules.
const DEMO_NAMES: Partial<Record<ModuleType, string[]>> = {
  REFERRAL: ["John Doe", "Jane Smith", "Alice Johnson"],
  LEAD: [
    "Sunrise Care Facility",
    "Lakeside Health Center",
    "Maple Grove Nursing",
  ],
  CONTACT: ["Dr. Sarah Mitchell", "Robert Chen, RN", "Angela Torres"],
  COMPANY: ["CarePoint Group", "Harbor Health Partners"],
};

const DEMO_SUBSCRIBERS = ["referrals@example.com", "intake@example.com"];

const DEMO_MARKETING = {
  facility: "Sunrise Care Facility",
  talkedTo: "Dr. Sarah Mitchell",
  reasonForVisit: "Quarterly relationship check-in",
};

const DEMO_MILEAGE = {
  destination: "Sunrise Care Facility",
  countiesMarketed: "Springfield County",
  beginningMileage: 10250,
  endingMileage: 10287,
};

const apply = process.argv.includes("--apply");
const orgArg = process.argv
  .find((arg) => arg.startsWith("--org="))
  ?.slice("--org=".length);

// Sample field values are expected on a seeded record. Anything else means a
// person touched it, and a touched record is theirs to delete, not ours.
const touchedBy = (record: {
  assignedTo: string | null;
  _count: {
    history: number;
    activities: number;
    bookings: number;
    formSubmissions: number;
  };
}) => {
  if (record.assignedTo) return "assigned to a user";
  if (record._count.history) return "has edit history";
  if (record._count.activities) return "has activity";
  if (record._count.bookings) return "has a booking";
  if (record._count.formSubmissions) return "has a form submission";
  return null;
};

async function main() {
  const orgFilter = orgArg ? { organizationId: orgArg } : {};

  const candidates = await prisma.board.findMany({
    where: {
      ...orgFilter,
      isDeleted: false,
      moduleType: { in: Object.keys(DEMO_NAMES) as ModuleType[] },
    },
    select: {
      id: true,
      recordName: true,
      moduleType: true,
      organizationId: true,
      assignedTo: true,
      relationsAsSource: { select: { targetId: true } },
      relationsAsTarget: { select: { sourceId: true } },
      _count: {
        select: {
          history: true,
          activities: true,
          bookings: true,
          formSubmissions: true,
        },
      },
    },
  });

  const demo = candidates.filter((record) => {
    const name = decryptNullable(record.recordName) ?? "";
    return DEMO_NAMES[record.moduleType]?.includes(name);
  });

  const demoIds = new Set(demo.map((record) => record.id));

  const removable: typeof demo = [];
  for (const record of demo) {
    const name = decryptNullable(record.recordName) ?? "";
    const reason = touchedBy(record);

    // The seed linked demo leads to demo contacts, so those relations are
    // expected. A link to anything else means real data points at this row.
    const foreignLink = [
      ...record.relationsAsSource.map((r) => r.targetId),
      ...record.relationsAsTarget.map((r) => r.sourceId),
    ].some((id) => !demoIds.has(id));

    if (reason || foreignLink) {
      console.log(
        `  skip  ${record.organizationId} ${record.moduleType} "${name}" - ${
          reason ?? "linked to a real record"
        }`
      );
      continue;
    }

    removable.push(record);
  }

  const marketing = await prisma.marketing.findMany({
    where: { ...orgFilter, isDeleted: false, ...DEMO_MARKETING },
    select: { id: true, organizationId: true },
  });

  const mileage = await prisma.mileage.findMany({
    where: { ...orgFilter, isDeleted: false, ...DEMO_MILEAGE },
    select: { id: true, organizationId: true },
  });

  // Addresses are encrypted, so the demo rows are found through the blind index.
  const subscribers = await prisma.emailSubscriber.findMany({
    where: {
      ...orgFilter,
      recordId: null,
      emailHash: { in: DEMO_SUBSCRIBERS.map(emailIndex) },
    },
    select: { id: true, organizationId: true },
  });

  console.log(
    `\n${removable.length} records, ${marketing.length} visit logs, ` +
      `${mileage.length} mileage entries, ${subscribers.length} subscribers`
  );

  if (!apply) {
    console.log("Dry run. Pass --apply to remove them.");
    return;
  }

  // Soft delete throughout: every list and analytics query filters isDeleted,
  // and a wrong call here stays recoverable.
  const [records, logs, trips] = await Promise.all([
    prisma.board.updateMany({
      where: { id: { in: removable.map((r) => r.id) } },
      data: { isDeleted: true },
    }),
    prisma.marketing.updateMany({
      where: { id: { in: marketing.map((r) => r.id) } },
      data: { isDeleted: true },
    }),
    prisma.mileage.updateMany({
      where: { id: { in: mileage.map((r) => r.id) } },
      data: { isDeleted: true },
    }),
  ]);

  const removedSubscribers = await prisma.emailSubscriber.deleteMany({
    where: { id: { in: subscribers.map((r) => r.id) } },
  });

  console.log(
    `Removed ${records.count} records, ${logs.count} visit logs, ` +
      `${trips.count} mileage entries, ${removedSubscribers.count} subscribers`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
