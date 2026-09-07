import type { PrismaClient } from "@prisma/client";
import { decryptNullable } from "../../../src/lib/crypto/crypto";
import { COMPANY_NAMES, CONTACT_FIRST, CONTACT_LAST } from "./catalog/crm";
import { FACILITY_PREFIX, FACILITY_SUFFIX } from "./catalog/facilities";
import { EXPENSE_DESCRIPTIONS, MILEAGE_DESTINATIONS } from "./catalog/liaison";
import { PATIENT_NAMES } from "./catalog/referrals";

const DEMO_PROJECT_NAME = "Territory Operations";

// Every prefix and suffix the catalog can pair, not the subset one profile
// happens to use, so a wipe after an enterprise run clears an earlier one too.
const FACILITY_NAMES = new Set(
  FACILITY_PREFIX.flatMap((prefix) =>
    FACILITY_SUFFIX.map((suffix) => `${prefix} ${suffix}`)
  )
);

const COMPANY_NAME_SET = new Set(COMPANY_NAMES);
const FIRST_NAMES = new Set(CONTACT_FIRST);
const LAST_NAMES = new Set(CONTACT_LAST);

// recordName is encrypted, so a demo row is recognised by its decrypted name
// coming out of this script's own vocabulary. Anything a person typed is left
// alone, which is what stops --wipe from clearing a real board.
const isDemoName = (moduleType: string, name: string): boolean => {
  if (moduleType === "LEAD") return FACILITY_NAMES.has(name);
  if (moduleType === "COMPANY") return COMPANY_NAME_SET.has(name);

  if (moduleType === "CONTACT") {
    const [first, last] = name.split(" ");
    return FIRST_NAMES.has(first) && LAST_NAMES.has(last);
  }

  if (moduleType === "REFERRAL") {
    const patient = name.split(" — ")[0];
    return name.includes(" — ") && PATIENT_NAMES.includes(patient);
  }

  return false;
};

export async function wipeDemoData(
  prisma: PrismaClient,
  organizationId: string
): Promise<void> {
  const candidates = await prisma.board.findMany({
    where: {
      organizationId,
      moduleType: { in: ["LEAD", "REFERRAL", "CONTACT", "COMPANY"] },
    },
    select: { id: true, recordName: true, moduleType: true },
  });

  const ids = candidates
    .filter((record) =>
      isDemoName(record.moduleType, decryptNullable(record.recordName) ?? "")
    )
    .map((record) => record.id);

  // FieldValue, History and BoardRelation all cascade from Board, so the record
  // delete is enough for them. Marketing only sets its link null, so its rows
  // are removed first while the facility ids are still known.
  await prisma.$transaction([
    prisma.marketing.deleteMany({
      where: { organizationId, facilityRecordId: { in: ids } },
    }),
    prisma.board.deleteMany({ where: { id: { in: ids } } }),
    prisma.expense.deleteMany({
      where: { organizationId, description: { in: EXPENSE_DESCRIPTIONS } },
    }),
    prisma.mileage.deleteMany({
      where: { organizationId, destination: { in: MILEAGE_DESTINATIONS } },
    }),
    prisma.taskProject.deleteMany({
      where: { organizationId, name: DEMO_PROJECT_NAME },
    }),
  ]);

  console.log(`Wiped ${ids.length} seeded records and their liaison logs`);
}
