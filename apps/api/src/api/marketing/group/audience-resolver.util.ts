// Duplicates board.service.ts's getAllBoards link-resolution (~line 145-175) and
// search/filter logic (~line 179-210), plus the private isLinkFieldType (~line 1174).
// Keep both in sync if either changes.
import { Board, BoardFieldType, Field } from "@prisma/client";
import { prisma } from "../../../lib/prisma/prisma";

type BoardValue = {
  field: Pick<Field, "id" | "fieldName" | "fieldType">;
  value: string | null;
};

type BoardWithValues = Board & { values: BoardValue[] };

function isLinkFieldType(fieldType: BoardFieldType) {
  return (
    fieldType === BoardFieldType.REFERRAL_LINK ||
    fieldType === BoardFieldType.CONTACT_LINK ||
    fieldType === BoardFieldType.COMPANY_LINK
  );
}

export async function resolveLinkFieldValues<T extends BoardWithValues>(
  boards: T[],
  fields: Pick<Field, "id" | "fieldType">[],
  organizationId: string
): Promise<T[]> {
  const linkFieldIds = new Set(
    fields.filter((f) => isLinkFieldType(f.fieldType)).map((f) => f.id)
  );

  const linkTargetIds = new Set<string>();
  for (const b of boards) {
    for (const v of b.values) {
      if (linkFieldIds.has(v.field.id) && v.value) linkTargetIds.add(v.value);
    }
  }

  const linkTargets = linkTargetIds.size
    ? await prisma.board.findMany({
        where: { id: { in: [...linkTargetIds] }, organizationId },
        select: { id: true, recordName: true },
      })
    : [];
  const linkNameById = new Map(linkTargets.map((t) => [t.id, t.recordName]));

  for (const b of boards) {
    for (const v of b.values) {
      if (!linkFieldIds.has(v.field.id) || !v.value) continue;
      const targetName = linkNameById.get(v.value);
      if (targetName === undefined) continue;
      v.value = targetName;
    }
  }

  return boards;
}

export function applyAudienceFilter<T extends BoardWithValues>(
  boards: T[],
  fields: Pick<Field, "id" | "fieldType">[],
  { search, filter }: { search?: string; filter?: Record<string, string> }
): T[] {
  let result = boards;

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (b) =>
        b.recordName.toLowerCase().includes(q) ||
        b.values.some((v) => v.value?.toLowerCase().includes(q))
    );
  }

  if (filter && Object.keys(filter).length > 0) {
    const fieldTypeMap = new Map(fields.map((f) => [f.id, f.fieldType]));

    for (const [id, val] of Object.entries(filter)) {
      if (val === undefined || val === "") continue;

      const fieldType = fieldTypeMap.get(id);
      const useExactMatch =
        fieldType &&
        (fieldType === "DROPDOWN" ||
          fieldType === "STATUS" ||
          fieldType === "CHECKBOX");
      const needle = String(val).toLowerCase();

      result = result.filter((b) =>
        b.values.some((v) => {
          if (v.field.id !== id || v.value == null) return false;
          const hay = v.value.toLowerCase();
          return useExactMatch ? hay === needle : hay.includes(needle);
        })
      );
    }
  }

  return result;
}
