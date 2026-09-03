import {
  BoardFieldType,
  ModuleType,
  PrismaClient,
  RelationType,
} from "@prisma/client";
import { decryptString, isEncrypted } from "../../src/lib/crypto/crypto";
import { recordNameIndex } from "../../src/lib/crypto/record-name-index";

// Imported records never got a BoardRelation: the importer wrote the linked
// record's name into the cell and stopped there. Analytics reads relations, so
// every imported referral was missing from the facility and county figures.
// The importer creates them now; this fills in what it already wrote.

const prisma = new PrismaClient();

const plain = (value: string | null | undefined) =>
  value ? (isEncrypted(value) ? decryptString(value) : value) : null;

const LINK_TYPES = [
  BoardFieldType.REFERRAL_LINK,
  BoardFieldType.CONTACT_LINK,
  BoardFieldType.COMPANY_LINK,
];

const RELATION_BY_TYPE: Record<string, RelationType> = {
  [BoardFieldType.REFERRAL_LINK]: RelationType.REFERRAL_LINK,
  [BoardFieldType.CONTACT_LINK]: RelationType.CONTACT_LINK,
  [BoardFieldType.COMPANY_LINK]: RelationType.COMPANY_LINK,
};

// Same resolution the service uses, including the one field that links two
// account modules together.
const targetModule = (field: {
  fieldType: BoardFieldType;
  moduleType: ModuleType;
  fieldName: string;
}): ModuleType => {
  if (field.fieldType === BoardFieldType.CONTACT_LINK) return ModuleType.CONTACT;
  if (field.fieldType === BoardFieldType.COMPANY_LINK) return ModuleType.COMPANY;
  if (field.moduleType === ModuleType.CONTACT && field.fieldName === "Company") {
    return ModuleType.COMPANY;
  }
  return ModuleType.LEAD;
};

async function main() {
  const linkFields = await prisma.field.findMany({
    where: { fieldType: { in: LINK_TYPES }, isDeleted: false },
    select: {
      id: true,
      fieldName: true,
      fieldType: true,
      moduleType: true,
      organizationId: true,
    },
  });

  let created = 0;
  let unresolved = 0;

  for (const field of linkFields) {
    const targets = await prisma.board.findMany({
      where: {
        organizationId: field.organizationId,
        moduleType: targetModule(field),
        isDeleted: false,
      },
      select: { id: true, recordNameHash: true },
    });

    const byId = new Set(targets.map((target) => target.id));
    const byNameHash = new Map(
      targets
        .filter((target) => target.recordNameHash)
        .map((target) => [target.recordNameHash as string, target.id])
    );

    const values = await prisma.fieldValue.findMany({
      where: { fieldId: field.id, record: { isDeleted: false } },
      select: { recordId: true, value: true },
    });

    const rows: {
      sourceId: string;
      targetId: string;
      relationType: RelationType;
      organizationId: string | null;
    }[] = [];

    for (const row of values) {
      const value = plain(row.value)?.trim();
      if (!value) continue;

      const targetId = byId.has(value)
        ? value
        : byNameHash.get(recordNameIndex(value));

      if (!targetId) {
        unresolved += 1;
        continue;
      }

      rows.push({
        sourceId: row.recordId,
        targetId,
        relationType: RELATION_BY_TYPE[field.fieldType],
        organizationId: field.organizationId,
      });
    }

    if (rows.length === 0) continue;

    // skipDuplicates leans on the (sourceId, targetId, relationType) unique, so
    // a re-run adds nothing and the script is safe to repeat.
    const result = await prisma.boardRelation.createMany({
      data: rows,
      skipDuplicates: true,
    });
    created += result.count;
  }

  console.log(
    `Created ${created} board relation(s) across ${linkFields.length} link field(s); ${unresolved} cell(s) named a record that no longer exists`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
