import { Prisma } from "@prisma/client";
import { recordNameIndex } from "../crypto/record-name-index";
import { prisma } from "../prisma/prisma";

// A referral points at its facility two ways. Interactive edits write a
// BoardRelation; an imported log only ever carried the facility name in the
// cell, so it has none. Reading relations alone drops every imported row out
// of whatever is being counted, which is why those numbers read empty.
//
// Shared because both the referral analytics and the liaison marketing report
// need it and the report was still on the relation-only read.

export type ReferralFacility = {
  id: string;
  recordName: string;
  county: string | null;
  // Board.assignedTo on a LEAD is what the board labels Account Manager.
  accountManager: string | null;
};

export const referralRecordWhere = (
  organizationId: string,
  startDate?: Date,
  endDate?: Date,
  assignedTo?: string | null
): Prisma.BoardWhereInput => ({
  moduleType: "REFERRAL",
  organizationId,
  isDeleted: false,
  ...(assignedTo && { assignedTo }),
  ...(startDate && endDate && { createdAt: { gte: startDate, lte: endDate } }),
});

// Maps each referral in scope to the facility it came from.
export const resolveReferralFacilities = async (
  organizationId: string,
  startDate?: Date,
  endDate?: Date,
  assignedTo?: string | null
): Promise<Map<string, ReferralFacility>> => {
  const source = referralRecordWhere(
    organizationId,
    startDate,
    endDate,
    assignedTo
  );

  const [relations, facilityValues] = await Promise.all([
    prisma.boardRelation.findMany({
      where: {
        relationType: "REFERRAL_LINK",
        source,
        target: { moduleType: "LEAD", isDeleted: false },
      },
      select: { sourceId: true, targetId: true },
    }),
    prisma.fieldValue.findMany({
      where: {
        // By type, not by name: the column is seeded as "Facility" but an
        // organization is free to rename it.
        field: {
          fieldType: "REFERRAL_LINK",
          moduleType: "REFERRAL",
          isDeleted: false,
        },
        record: source,
      },
      select: { recordId: true, value: true },
    }),
  ]);

  const targetByReferral = new Map(
    relations.map((relation) => [relation.sourceId, relation.targetId])
  );

  // The cell holds either the target id or the name it was imported under.
  const loose = facilityValues.filter(
    (row) => row.value && !targetByReferral.has(row.recordId)
  );
  const rawValues = [...new Set(loose.map((row) => row.value as string))];

  // Names are matched through the blind index rather than by decrypting the
  // whole master list, the same way a duplicate name is detected on write.
  const nameHashes = rawValues.map((value) => recordNameIndex(value));
  const targetIds = [...new Set(relations.map((r) => r.targetId))];

  const leads =
    targetIds.length || rawValues.length
      ? await prisma.board.findMany({
          where: {
            organizationId,
            moduleType: "LEAD",
            isDeleted: false,
            OR: [
              { id: { in: [...targetIds, ...rawValues] } },
              { recordNameHash: { in: nameHashes } },
            ],
          },
          select: {
            id: true,
            recordName: true,
            recordNameHash: true,
            assignedTo: true,
            values: {
              where: {
                field: {
                  fieldName: "County",
                  moduleType: "LEAD",
                  isDeleted: false,
                },
              },
              select: { value: true },
            },
          },
        })
      : [];

  const toFacility = (lead: (typeof leads)[number]): ReferralFacility => ({
    id: lead.id,
    recordName: lead.recordName,
    county: lead.values[0]?.value ?? null,
    accountManager: lead.assignedTo,
  });

  const byId = new Map(leads.map((lead) => [lead.id, toFacility(lead)]));
  const byNameHash = new Map(
    leads
      .filter((lead) => lead.recordNameHash)
      .map((lead) => [lead.recordNameHash as string, toFacility(lead)])
  );

  const byReferral = new Map<string, ReferralFacility>();

  for (const [referralId, targetId] of targetByReferral) {
    const facility = byId.get(targetId);
    if (facility) byReferral.set(referralId, facility);
  }

  for (const row of loose) {
    const value = row.value as string;
    const facility = byId.get(value) ?? byNameHash.get(recordNameIndex(value));
    if (facility) byReferral.set(row.recordId, facility);
  }

  return byReferral;
};
