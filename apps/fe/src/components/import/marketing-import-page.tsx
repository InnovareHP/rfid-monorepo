import { useMarketingImport } from "@/hooks/use-marketing-import";
import { downloadCSVTemplate } from "@/lib/fe-helpers";
import {
  IMPORT_HEADERS,
  parseImportRows,
  toBatches,
  type MarketingImportKind,
} from "@/lib/helper/marketing-import";
import {
  parseSpreadsheet,
  pickDefaultSheet,
  type ParsedSheet,
} from "@/lib/helper/spreadsheet-parse";
import { MARKETING_IMPORT_BATCH_SIZE } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { Progress } from "@dashboard/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { FileDown, SearchCheck, Undo2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ImportDropzone } from "./import-dropzone";
import { ImportPreviewTable } from "./import-preview-table";
import { MarketingImportSummary } from "./marketing-import-summary";

const KINDS: Record<
  MarketingImportKind,
  { label: string; ok: string; skipped: string }
> = {
  logs: {
    label: "Marketing logs",
    ok: "logs to create",
    skipped: "already imported",
  },
  managers: {
    label: "Account managers",
    ok: "to assign",
    skipped: "already set",
  },
};

export default function MarketingImportPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [kind, setKind] = useState<MarketingImportKind>("logs");
  const [file, setFile] = useState<File | null>(null);
  const [sheet, setSheet] = useState<ParsedSheet | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const parsed = useMemo(
    () => (sheet ? parseImportRows(kind, sheet.headers, sheet.rows) : null),
    [kind, sheet]
  );
  const batches = useMemo(() => toBatches(parsed?.rows ?? []), [parsed]);
  const {
    checked,
    imported,
    importedIds,
    progress,
    failedBatch,
    reset,
    check,
    run,
    undo,
    busy,
  } = useMarketingImport(kind, batches);

  const removeFile = () => {
    setFile(null);
    setSheet(null);
    reset();
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    removeFile();
    setFile(selected);
    setIsParsing(true);
    try {
      const workbook = await parseSpreadsheet(selected);
      setSheet(pickDefaultSheet(workbook.sheets));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to read this file."
      );
      removeFile();
    } finally {
      setIsParsing(false);
    }
  };

  const fileErrors = parsed?.errors ?? [];
  const canCheck =
    !!parsed && !fileErrors.length && batches.length > 0 && !busy;
  const canImport =
    !!checked &&
    !checked.problems.length &&
    checked.ok > 0 &&
    !imported &&
    !busy;

  return (
    <div className="page-style animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="page-title text-3xl font-bold tracking-tight sm:text-4xl">
            Import Marketing Data
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Logs keep their original dates and are credited to you. Every file
            is checked first, then sent in batches of{" "}
            {MARKETING_IMPORT_BATCH_SIZE} rows.
          </p>
        </div>
        <Button
          onClick={() =>
            downloadCSVTemplate(
              IMPORT_HEADERS[kind],
              `${KINDS[kind].label.replace(/\s+/g, "_")}_Template`
            )
          }
        >
          <FileDown className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Import</p>
            <Select
              value={kind}
              disabled={busy}
              onValueChange={(value) => {
                setKind(value as MarketingImportKind);
                reset();
              }}
            >
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(KINDS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Columns: {IMPORT_HEADERS[kind].join(", ")}
            </p>
          </div>

          <ImportDropzone
            inputRef={inputRef}
            file={file}
            isParsing={isParsing}
            onFileChange={handleFileChange}
            onRemove={removeFile}
          />

          {sheet && (
            <ImportPreviewTable headers={sheet.headers} rows={sheet.rows} />
          )}

          {fileErrors.length > 0 && (
            <MarketingImportSummary
              title="Fix these rows in the file and upload it again"
              summary={{
                ok: parsed?.rows.length ?? 0,
                skipped: 0,
                problems: fileErrors,
              }}
              okLabel="readable rows"
              skippedLabel="skipped"
            />
          )}

          {progress && (
            <div className="space-y-2">
              <Progress value={(progress.done / progress.total) * 100} />
              <p className="text-xs text-muted-foreground">
                Batch {Math.min(progress.done + 1, progress.total)} of{" "}
                {progress.total}
              </p>
            </div>
          )}

          {checked && (
            <MarketingImportSummary
              title={
                checked.problems.length
                  ? "Check found rows to fix"
                  : "Check passed, nothing written yet"
              }
              summary={checked}
              okLabel={KINDS[kind].ok}
              skippedLabel={KINDS[kind].skipped}
            />
          )}

          {imported && (
            <MarketingImportSummary
              title={
                failedBatch === null
                  ? "Import complete"
                  : `Stopped at batch ${failedBatch + 1}`
              }
              summary={imported}
              okLabel={kind === "logs" ? "logs created" : "assigned"}
              skippedLabel={KINDS[kind].skipped}
            />
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              variant="outline"
              disabled={!canCheck}
              onClick={() => check.mutate()}
            >
              <SearchCheck className="h-4 w-4" />
              {check.isPending ? "Checking..." : "Check file"}
            </Button>
            {failedBatch !== null && imported ? (
              <Button disabled={busy} onClick={() => run.mutate(failedBatch)}>
                <Upload className="h-4 w-4" />
                Resume from batch {failedBatch + 1}
              </Button>
            ) : (
              <Button disabled={!canImport} onClick={() => run.mutate(0)}>
                <Upload className="h-4 w-4" />
                {run.isPending ? "Importing..." : "Import"}
              </Button>
            )}
            {importedIds.length > 0 && (
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => undo.mutate()}
              >
                <Undo2 className="h-4 w-4" />
                {undo.isPending
                  ? "Undoing..."
                  : `Undo this import (${importedIds.length})`}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
