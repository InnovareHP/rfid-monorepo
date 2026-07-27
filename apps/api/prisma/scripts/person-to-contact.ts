import { BoardFieldType, PrismaClient } from "@prisma/client";
import {
  decryptString,
  encryptString,
  isEncrypted,
} from "../../src/lib/crypto/crypto";

// Converts LEAD module PERSON fields into CONTACT_LINK fields backed by
// CONTACT board records and CONTACT_LINK relations. Referral PERSON fields
// (patients) are intentionally left untouched.

const raw = new PrismaClient();

const plain = (v: string | null | undefined) =>
  v ? (isEncrypted(v) ? decryptString(v) : v) : null;

const CONTACT_DETAIL_FIELDS: [string, BoardFieldType][] = [
  ["Email", BoardFieldType.EMAIL],
  ["Phone", BoardFieldType.PHONE],
  ["Address", BoardFieldType.LOCATION],
];

async function ensureContactFields(organizationId: string) {
  const existing = await raw.field.findMany({
    where: { organizationId, moduleType: "CONTACT", isDeleted: false },
  });
  const maxOrder = existing.reduce((m, f) => Math.max(m, f.fieldOrder), 0);
  let order = maxOrder;

  for (const [fieldName, fieldType] of CONTACT_DETAIL_FIELDS) {
    if (existing.some((f) => f.fieldName === fieldName)) continue;
    order += 1;
    existing.push(
      await raw.field.create({
        data: {
          fieldName,
          fieldType,
          fieldOrder: order,
          organizationId,
          moduleType: "CONTACT",
        },
      })
    );
  }
  return existing;
}

async function run() {
  const personFields = await raw.field.findMany({
    where: {
      fieldType: BoardFieldType.PERSON,
      moduleType: "LEAD",
      isDeleted: false,
    },
  });

  const orgIds = [...new Set(personFields.map((f) => f.organizationId))];
  let contactsCreated = 0;
  let relationsCreated = 0;

  for (const organizationId of orgIds) {
    const contactFields = await ensureContactFields(organizationId);
    const fieldIdByName = new Map(contactFields.map((f) => [f.fieldName, f.id]));

    const existingContacts = await raw.board.findMany({
      where: { organizationId, moduleType: "CONTACT", isDeleted: false },
      select: { id: true, recordName: true },
    });
    const contactIdByName = new Map(
      existingContacts.map((c) => [plain(c.recordName)?.toLowerCase(), c.id])
    );

    const orgPersonFields = personFields.filter(
      (f) => f.organizationId === organizationId
    );

    const values = await raw.fieldValue.findMany({
      where: { fieldId: { in: orgPersonFields.map((f) => f.id) } },
      include: { contactValue: true },
    });

    for (const fv of values) {
      const name = plain(fv.value)?.trim();
      if (!name) continue;

      let contactId = contactIdByName.get(name.toLowerCase());

      if (!contactId) {
        const contact = await raw.board.create({
          data: {
            recordName: encryptString(name),
            moduleType: "CONTACT",
            organizationId,
          },
        });
        contactId = contact.id;
        contactIdByName.set(name.toLowerCase(), contactId);
        contactsCreated++;

        const details: [string, string | null][] = [
          ["Phone", plain(fv.contactValue?.contactNumber)],
          ["Email", plain(fv.contactValue?.email)],
          ["Address", plain(fv.contactValue?.address)],
        ];
        for (const [fieldName, detail] of details) {
          const fieldId = fieldIdByName.get(fieldName);
          if (!fieldId || !detail) continue;
          await raw.fieldValue.create({
            data: {
              recordId: contactId,
              fieldId,
              value: encryptString(detail),
              organizationId,
            },
          });
        }
      }

      const created = await raw.boardRelation.createMany({
        data: [
          {
            sourceId: fv.recordId,
            targetId: contactId,
            relationType: "CONTACT_LINK",
            organizationId,
          },
        ],
        skipDuplicates: true,
      });
      relationsCreated += created.count;

      // Link values store the target board id, not the display name
      await raw.fieldValue.update({
        where: { id: fv.id },
        data: { value: encryptString(contactId) },
      });
    }

    await raw.field.updateMany({
      where: { id: { in: orgPersonFields.map((f) => f.id) } },
      data: { fieldType: BoardFieldType.CONTACT_LINK },
    });
  }

  console.log(
    `Converted ${personFields.length} lead PERSON fields across ${orgIds.length} orgs: ${contactsCreated} contacts created, ${relationsCreated} relations created`
  );
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => raw.$disconnect());
