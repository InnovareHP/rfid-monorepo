import { BoardFieldType, ModuleType, PrismaClient } from "@prisma/client";
import {
  decryptString,
  encryptString,
  isEncrypted,
} from "../../src/lib/crypto/crypto";

// Converts legacy link FieldValues that store the target record name into
// the target board id. Run after person-to-contact.ts.

const raw = new PrismaClient();

const plain = (v: string | null | undefined) =>
  v ? (isEncrypted(v) ? decryptString(v) : v) : null;

const LINK_TYPES = [
  BoardFieldType.REFERRAL_LINK,
  BoardFieldType.CONTACT_LINK,
  BoardFieldType.COMPANY_LINK,
];

function resolveTargetModule(field: {
  fieldType: BoardFieldType;
  moduleType: ModuleType;
  fieldName: string;
}): ModuleType {
  if (field.fieldType === BoardFieldType.CONTACT_LINK) return "CONTACT";
  if (field.fieldType === BoardFieldType.COMPANY_LINK) return "COMPANY";
  if (field.moduleType === "CONTACT" && field.fieldName === "Company")
    return "COMPANY";
  return "LEAD";
}

async function run() {
  const linkFields = await raw.field.findMany({
    where: { fieldType: { in: LINK_TYPES }, isDeleted: false },
  });

  let converted = 0;
  let unresolved = 0;

  for (const field of linkFields) {
    const targetModule = resolveTargetModule(field);

    const targets = await raw.board.findMany({
      where: {
        organizationId: field.organizationId,
        moduleType: targetModule,
        isDeleted: false,
      },
      select: { id: true, recordName: true },
    });
    const targetIds = new Set(targets.map((t) => t.id));
    const idByName = new Map(targets.map((t) => [plain(t.recordName), t.id]));

    const values = await raw.fieldValue.findMany({
      where: { fieldId: field.id },
      select: { id: true, value: true },
    });

    for (const fv of values) {
      const current = plain(fv.value)?.trim();
      if (!current) continue;
      if (targetIds.has(current)) continue;

      const targetId = idByName.get(current);
      if (!targetId) {
        unresolved++;
        continue;
      }

      await raw.fieldValue.update({
        where: { id: fv.id },
        data: { value: encryptString(targetId) },
      });
      converted++;
    }
  }

  console.log(
    `Converted ${converted} link values to ids across ${linkFields.length} link fields; ${unresolved} values had no matching target record`
  );
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());
