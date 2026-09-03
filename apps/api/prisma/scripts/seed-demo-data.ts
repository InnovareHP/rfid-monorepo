import {
  Prisma,
  PrismaClient,
  type ModuleType,
  type TouchpointType,
} from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { encryptString } from "../../src/lib/crypto/crypto";
import { recordNameIndexes } from "../../src/lib/crypto/record-name-index";

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

const prisma = new PrismaClient();

const orgArg = process.argv
  .find((arg) => arg.startsWith("--org="))
  ?.slice("--org=".length);
const wipe = process.argv.includes("--wipe");

// Deterministic, so a demo rehearsed once looks the same when it is given.
let seed = 20260903;
const random = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};
const pick = <T>(values: readonly T[]) =>
  values[Math.floor(random() * values.length)];
const between = (min: number, max: number) =>
  min + Math.floor(random() * (max - min + 1));

const FACILITY_PREFIX = [
  "Cedar Ridge",
  "Lakeview",
  "Northgate",
  "Silver Creek",
  "Harbor Point",
  "Willow Bend",
  "Stonebridge",
  "Fairhaven",
  "Brookside",
  "Summit View",
  "Ashford",
  "Granite Hill",
  "Meadowlark",
  "Riverstone",
  "Copper Basin",
  "Elmwood",
  "Quailridge",
  "Sandpiper",
  "Thornwood",
  "Vantage Park",
];

const FACILITY_SUFFIX = [
  "Nursing & Rehabilitation",
  "Health Center",
  "Senior Living",
  "Care Community",
  "Post-Acute Care",
  "Skilled Nursing",
];

const COUNTIES = [
  "Sangamon",
  "Macon",
  "Champaign",
  "Peoria",
  "Winnebago",
  "McLean",
  "Tazewell",
  "Adams",
];

const CITIES = [
  "Springfield",
  "Decatur",
  "Champaign",
  "Peoria",
  "Rockford",
  "Bloomington",
  "Pekin",
  "Quincy",
];

const FACILITY_TYPES = [
  "Skilled Nursing",
  "Assisted Living",
  "Memory Care",
  "Rehabilitation",
];

const CLINICIANS = [
  "Dr. Amara Osei",
  "Dr. Peter Lindqvist",
  "Dr. Ruth Calderon",
  "Nadia Haddad, NP",
  "Marcus Villanueva, RN",
  "Dr. Ingrid Sollberger",
  "Teodora Iliescu, LCSW",
  "Dr. Kwame Boateng",
];

const PATIENT_NAMES = [
  "R. Whitfield",
  "M. Castellanos",
  "D. Aberdeen",
  "S. Novakova",
  "T. Oyelaran",
  "K. Marchetti",
  "J. Halvorsen",
  "P. Nakashima",
  "L. Fitzgerald",
  "B. Achterberg",
];

const PAYORS = ["Medicare", "Medicaid", "Private Insurance", "Self-Pay"];
const ADMISSION_TYPES = ["Emergency", "Routine", "Transfer"];
const REMOTE_ONSITE = ["Remote", "Onsite"];
const LEAD_STAGES = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];

const DENIAL_REASONS = [
  "Bed unavailable at intake",
  "Insurance authorization denied",
  "Behavioral needs exceeded staffing",
  "Family chose another provider",
  "Clinically inappropriate for level of care",
];

// Values from the TouchpointType enum, not invented ones: a bad member would
// fail the insert, and the touchpoint chart reads these verbatim.
const TOUCHPOINTS: TouchpointType[] = [
  "IN_PERSON_MEETING",
  "PHONE",
  "EMAIL",
  "TEXT",
  "LINKED_IN",
];

const VISIT_REASONS = [
  "Quarterly relationship check-in",
  "Introduced new admissions criteria",
  "Followed up on a pending referral",
  "Dropped off updated capability sheet",
  "Met the new director of nursing",
];

// Weeks back from today, so trends have shape instead of a flat line.
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

type FieldRow = { id: string; fieldName: string; moduleType: ModuleType };

const valueRow = (
  recordId: string,
  fields: FieldRow[],
  fieldName: string,
  value: string,
  organizationId: string
) => {
  const field = fields.find((candidate) => candidate.fieldName === fieldName);
  if (!field || !value) return null;

  return {
    recordId,
    fieldId: field.id,
    value: encryptString(value),
    organizationId,
  };
};

async function main() {
  const organization = orgArg
    ? await prisma.organization.findUnique({ where: { id: orgArg } })
    : await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });

  if (!organization) {
    throw new Error(
      "No organization found. Pass --org=<organizationId> for the one to seed."
    );
  }

  const organizationId = organization.id;
  console.log(`Seeding demo data into ${organization.name} (${organizationId})`);

  const modules = await prisma.module.findMany({
    where: { organizationId },
    select: { id: true, key: true },
  });
  const moduleIdFor = (key: string) => {
    const found = modules.find((module) => module.key === key);
    if (!found) throw new Error(`Organization has no ${key} module`);
    return found.id;
  };

  const fields = (await prisma.field.findMany({
    where: { organizationId, isDeleted: false },
    select: { id: true, fieldName: true, moduleType: true },
  })) as FieldRow[];

  const leadFields = fields.filter((field) => field.moduleType === "LEAD");
  const referralFields = fields.filter(
    (field) => field.moduleType === "REFERRAL"
  );

  if (!leadFields.length || !referralFields.length) {
    throw new Error(
      "Organization has no lead or referral fields. Onboarding seeding has to run first."
    );
  }

  const members = await prisma.member.findMany({
    where: { organizationId },
    select: { id: true, role: true, userId: true },
  });

  // Records are assigned to liaisons only, which is what the app enforces and
  // what every per-liaison report groups by.
  const liaisons = members.filter((member) => member.role === "liason");
  const assignable = liaisons.length ? liaisons : members;

  if (!assignable.length) {
    throw new Error("Organization has no members to assign records to");
  }

  if (wipe) {
    const demo = await prisma.board.findMany({
      where: { organizationId, moduleType: { in: ["LEAD", "REFERRAL"] } },
      select: { id: true },
    });
    const ids = demo.map((record) => record.id);

    await prisma.$transaction([
      prisma.boardRelation.deleteMany({ where: { organizationId } }),
      prisma.fieldValue.deleteMany({ where: { recordId: { in: ids } } }),
      prisma.marketing.deleteMany({ where: { organizationId } }),
      prisma.board.deleteMany({ where: { id: { in: ids } } }),
    ]);

    console.log(`Wiped ${ids.length} existing lead and referral records`);
  }

  // ── Facilities ──────────────────────────────────────────────
  const leadModuleId = moduleIdFor("LEAD");
  const facilities: { id: string; name: string; county: string }[] = [];
  const leadRows: Prisma.BoardCreateManyInput[] = [];
  const leadValues: {
    recordId: string;
    fieldId: string;
    value: string;
    organizationId: string;
  }[] = [];

  for (const prefix of FACILITY_PREFIX) {
    for (const suffix of FACILITY_SUFFIX.slice(0, 2)) {
      const name = `${prefix} ${suffix}`;
      const id = uuidv4();
      const county = pick(COUNTIES);
      const city = CITIES[COUNTIES.indexOf(county)] ?? pick(CITIES);

      facilities.push({ id, name, county });

      leadRows.push({
        id,
        recordName: encryptString(name),
        ...recordNameIndexes(name),
        moduleType: "LEAD",
        moduleId: leadModuleId,
        organizationId,
        assignedTo: pick(assignable).userId,
        createdAt: daysAgo(between(120, 400)),
      });

      const pairs: [string, string][] = [
        ["Number of Beds", String(between(40, 220))],
        ["Type of Facility", pick(FACILITY_TYPES)],
        ["County", county],
        ["City", city],
        ["State", "IL"],
        ["Zip Code", String(between(60000, 62999))],
        ["Phone", `(217) ${between(200, 899)}-${between(1000, 9999)}`],
        ["Psychiatric Services", pick(["Yes", "No"])],
        ["Status", pick(LEAD_STAGES)],
        ["Notes", pick(VISIT_REASONS)],
      ];

      for (const [fieldName, value] of pairs) {
        const row = valueRow(id, leadFields, fieldName, value, organizationId);
        if (row) leadValues.push(row);
      }
    }
  }

  await prisma.board.createMany({ data: leadRows, skipDuplicates: true });
  await prisma.fieldValue.createMany({
    data: leadValues,
    skipDuplicates: true,
  });
  console.log(`Created ${leadRows.length} facilities`);

  // ── Referrals ───────────────────────────────────────────────
  // Volume rises over the window so the trend charts slope instead of sitting
  // flat, and a fifth are rejected so denial reporting has something to show.
  const referralModuleId = moduleIdFor("REFERRAL");
  const referralRows: Prisma.BoardCreateManyInput[] = [];
  const referralValues: typeof leadValues = [];
  const relations: {
    sourceId: string;
    targetId: string;
    relationType: "REFERRAL_LINK";
    organizationId: string;
  }[] = [];

  const REFERRAL_COUNT = 320;

  for (let index = 0; index < REFERRAL_COUNT; index += 1) {
    const id = uuidv4();
    // Weighted towards recent months.
    const age = Math.floor(Math.pow(random(), 1.7) * 330);
    const createdAt = daysAgo(age);

    // A handful of facilities carry most of the volume, which is what makes a
    // top-sources report worth looking at.
    const facility =
      random() < 0.55
        ? facilities[between(0, 5)]
        : facilities[between(0, facilities.length - 1)];

    const patient = pick(PATIENT_NAMES);
    const name = `${patient} — ${createdAt.toISOString().slice(0, 10)}-${index}`;
    const admitted = random() < 0.62;
    const rejected = !admitted && random() < 0.5;
    const status = admitted ? "Admitted" : rejected ? "Rejected" : "Pending";

    referralRows.push({
      id,
      recordName: encryptString(name),
      ...recordNameIndexes(name),
      moduleType: "REFERRAL",
      moduleId: referralModuleId,
      organizationId,
      assignedTo: pick(assignable).userId,
      createdAt,
    });

    relations.push({
      sourceId: id,
      targetId: facility.id,
      relationType: "REFERRAL_LINK",
      organizationId,
    });

    const pairs: [string, string][] = [
      ["Referral Date", createdAt.toISOString().slice(0, 10)],
      ["County", facility.county],
      ["Facility", facility.id],
      ["Patient Name", patient],
      ["Contact", pick(CLINICIANS)],
      ["Assessor", pick(CLINICIANS)],
      ["Payor", pick(PAYORS)],
      ["Admission Type", pick(ADMISSION_TYPES)],
      ["Remote or Onsite", pick(REMOTE_ONSITE)],
      ["Status", status],
      ["Assessed", random() < 0.8 ? "true" : "false"],
      ["Number", `(217) ${between(200, 899)}-${between(1000, 9999)}`],
      ["Length of Assessment", `${between(30, 90)} minutes`],
    ];

    if (rejected) pairs.push(["Reason", pick(DENIAL_REASONS)]);
    if (admitted) {
      const actioned = new Date(createdAt);
      actioned.setDate(actioned.getDate() + between(1, 9));
      pairs.push([
        "Action Date (Accepted / Rejected)",
        actioned.toISOString().slice(0, 10),
      ]);
    }

    for (const [fieldName, value] of pairs) {
      const row = valueRow(id, referralFields, fieldName, value, organizationId);
      if (row) referralValues.push(row);
    }
  }

  await prisma.board.createMany({ data: referralRows, skipDuplicates: true });
  await prisma.fieldValue.createMany({
    data: referralValues,
    skipDuplicates: true,
  });
  await prisma.boardRelation.createMany({
    data: relations,
    skipDuplicates: true,
  });
  console.log(`Created ${referralRows.length} referrals linked to facilities`);

  // ── Marketing visit logs ────────────────────────────────────
  // The Analyze dialog reads these, and it matches on the facility name, so the
  // names written here are the facility names verbatim.
  const marketing: Prisma.MarketingCreateManyInput[] = [];

  for (let index = 0; index < 180; index += 1) {
    const facility = facilities[between(0, facilities.length - 1)];
    const member = pick(assignable);
    const touchpointCount = between(1, 2);

    marketing.push({
      facility: facility.name,
      touchpoints: Array.from({ length: touchpointCount }, () =>
        pick(TOUCHPOINTS)
      ),
      talkedTo: pick(CLINICIANS),
      reasonForVisit: pick(VISIT_REASONS),
      notes: pick(VISIT_REASONS),
      memberId: member.id,
      organizationId,
      facilityRecordId: facility.id,
      createdAt: daysAgo(between(1, 300)),
    });
  }

  await prisma.marketing.createMany({ data: marketing });
  console.log(`Created ${marketing.length} marketing visit logs`);

  console.log("\nDemo data ready.");
  console.log(`  Facilities        ${leadRows.length}`);
  console.log(`  Referrals         ${referralRows.length}`);
  console.log(`  Field values      ${leadValues.length + referralValues.length}`);
  console.log(`  Visit logs        ${marketing.length}`);
  console.log(`  Assigned across   ${assignable.length} member(s)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
