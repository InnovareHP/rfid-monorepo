import type { CreatedRecord } from "@/components/record-create/record-create-page";
import {
  hasFindings,
  type DuplicateFindings,
} from "@/lib/helper/duplicate-findings";
import {
  findModuleDuplicates,
  type ModuleColumn,
} from "@/services/board/board-module-service";
import { useState } from "react";

type UseDuplicateCheckArgs = {
  moduleType: string;
  columns: ModuleColumn[];
  onCreate: (records: CreatedRecord[]) => void;
};

const EMPTY: DuplicateFindings = {
  duplicates: [],
  exactMatch: null,
  nearMatches: [],
};

// Runs the create-time duplicate check both record create pages share. The
// check is advisory: a failed lookup falls through to the create rather than
// standing between the user and their record.
export function useDuplicateCheck({
  moduleType,
  columns,
  onCreate,
}: UseDuplicateCheckArgs) {
  const [findings, setFindings] = useState<DuplicateFindings | null>(null);
  const [pending, setPending] = useState<CreatedRecord[] | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const emailColumn = columns.find((column) => column.type === "EMAIL");
  const phoneColumn = columns.find((column) => column.type === "PHONE");

  const dismiss = () => {
    setFindings(null);
    setPending(null);
  };

  const submit = async (records: CreatedRecord[]) => {
    setIsChecking(true);
    try {
      const results = await Promise.all(
        records.map((record) =>
          findModuleDuplicates(moduleType, {
            recordName: record.recordName?.trim() || undefined,
            email: emailColumn
              ? record.values[emailColumn.id]?.trim()
              : undefined,
            phone: phoneColumn
              ? record.values[phoneColumn.id]?.trim()
              : undefined,
          })
        )
      );

      const merged = results.reduce<DuplicateFindings>(
        (all, result) => ({
          duplicates: [...all.duplicates, ...result.duplicates],
          exactMatch: all.exactMatch ?? result.exactMatch,
          nearMatches: [...all.nearMatches, ...result.nearMatches],
        }),
        EMPTY
      );

      if (hasFindings(merged)) {
        setFindings(merged);
        setPending(records);
        return;
      }

      onCreate(records);
    } catch {
      onCreate(records);
    } finally {
      setIsChecking(false);
    }
  };

  const createAnyway = () => {
    if (pending) onCreate(pending);
    dismiss();
  };

  return { findings, isChecking, submit, dismiss, createAnyway };
}
