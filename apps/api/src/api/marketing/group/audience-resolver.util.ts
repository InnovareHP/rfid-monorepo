// Duplicates board.service.ts's getAllBoards link-resolution (~line 145-175) and
// search/filter logic (~line 179-210), plus the private isLinkFieldType (~line 1174).
// Keep both in sync if either changes.
import {
  defaultFilterOperator,
  FilterOperator,
  matchesFilter,
  operatorNeedsValue,
} from "@dashboard/shared";
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
  {
    search,
    filter,
    operators,
  }: {
    search?: string;
    filter?: Record<string, string>;
    operators?: Record<string, FilterOperator>;
  }
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

  const fieldTypeMap = new Map(fields.map((f) => [f.id, f.fieldType]));
  const fieldIds = new Set([
    ...Object.keys(filter ?? {}),
    ...Object.keys(operators ?? {}),
  ]);

  for (const id of fieldIds) {
    const operator =
      operators?.[id] ?? defaultFilterOperator(fieldTypeMap.get(id));
    const needle = filter?.[id] ?? "";
    if (operatorNeedsValue(operator) && needle === "") continue;

    result = result.filter((b) =>
      matchesFilter(
        operator,
        b.values.find((v) => v.field.id === id)?.value,
        needle
      )
    );
  }

  return result;
}
