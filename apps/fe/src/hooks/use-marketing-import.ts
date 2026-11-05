import { boardQueryKey } from "@/lib/helper/board-query-key";
import {
  sheetLine,
  toBatches,
  type AccountManagerRow,
  type ImportSummary,
  type MarketingImportKind,
  type MarketingLogRow,
} from "@/lib/helper/marketing-import";
import {
  importAccountManagers,
  importMarketLogs,
  undoMarketLogImport,
} from "@/services/market/market-service";
import { MARKETING_IMPORT_BATCH_SIZE } from "@dashboard/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type ImportRow = MarketingLogRow | AccountManagerRow;

const EMPTY: ImportSummary = { ok: 0, skipped: 0, problems: [] };

const merge = (a: ImportSummary, b: ImportSummary): ImportSummary => ({
  ok: a.ok + b.ok,
  skipped: a.skipped + b.skipped,
  problems: [...a.problems, ...b.problems],
});

const issue = (label: string) => (item: { row: number; value: string }) => ({
  row: sheetLine(item.row),
  message: `${label}: ${item.value}`,
});

// Sends one batch and reads its result into the shared summary shape.
async function sendBatch(
  kind: MarketingImportKind,
  dryRun: boolean,
  firstRow: number,
  rows: ImportRow[]
) {
  if (kind === "logs") {
    const result = await importMarketLogs({
      dryRun,
      firstRow,
      rows: rows as MarketingLogRow[],
    });
    return {
      ids: result.ids,
      summary: {
        ok: result.created,
        skipped: result.duplicates,
        problems: result.missing.map(issue("Facility not in the Master List")),
      },
    };
  }

  const result = await importAccountManagers({
    dryRun,
    firstRow,
    rows: rows as AccountManagerRow[],
  });
  return {
    ids: [],
    summary: {
      ok: result.assigned,
      skipped: result.alreadySet,
      problems: [
        ...result.missing.map(issue("Facility not in the Master List")),
        ...result.unknownManagers.map(
          issue("No owner, admin or liaison with email")
        ),
      ],
    },
  };
}

// Batches go one at a time so a 10,000-row file never floods the server.
export function useMarketingImport(
  kind: MarketingImportKind,
  batches: ImportRow[][]
) {
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<ImportSummary | null>(null);
  const [imported, setImported] = useState<ImportSummary | null>(null);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [failedBatch, setFailedBatch] = useState<number | null>(null);

  const reset = () => {
    setChecked(null);
    setImported(null);
    setImportedIds([]);
    setProgress(null);
    setFailedBatch(null);
  };

  const runBatches = async (dryRun: boolean, startBatch: number) => {
    for (let index = startBatch; index < batches.length; index++) {
      setProgress({ done: index, total: batches.length });
      try {
        const { ids, summary } = await sendBatch(
          kind,
          dryRun,
          index * MARKETING_IMPORT_BATCH_SIZE,
          batches[index]
        );
        const record = dryRun ? setChecked : setImported;
        record((previous) => merge(previous ?? EMPTY, summary));
        setImportedIds((previous) => [...previous, ...ids]);
      } catch (error) {
        setFailedBatch(index);
        throw error;
      }
    }
    setProgress({ done: batches.length, total: batches.length });
    setFailedBatch(null);
  };

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["market-logs"] });
    await queryClient.invalidateQueries({ queryKey: boardQueryKey("LEAD") });
    await queryClient.invalidateQueries({
      queryKey: ["marketing-lead-analytics"],
    });
  };

  const check = useMutation({
    mutationFn: () => {
      reset();
      return runBatches(true, 0);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const run = useMutation({
    mutationFn: (startBatch: number) => runBatches(false, startBatch),
    onSuccess: () => toast.success("Import complete"),
    onError: (error: Error) => toast.error(error.message),
    onSettled: invalidate,
  });

  const undo = useMutation({
    mutationFn: async () => {
      for (const ids of toBatches(importedIds)) await undoMarketLogImport(ids);
    },
    onSuccess: () => {
      toast.success("Import undone");
      setImported(null);
      setImportedIds([]);
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: invalidate,
  });

  return {
    checked,
    imported,
    importedIds,
    progress,
    failedBatch,
    reset,
    check,
    run,
    undo,
    busy: check.isPending || run.isPending || undo.isPending,
  };
}
