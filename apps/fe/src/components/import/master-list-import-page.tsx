import { downloadCSVTemplate } from "@/lib/fe-helpers";
import { boardQueryKey } from "@/lib/helper/board-query-key";
import {
  autoMatchColumns,
  CREATE_COLUMN,
  inferFieldType,
  suggestColumns,
  type ColumnSuggestion,
  type NewFieldType,
} from "@/lib/helper/csv-column-mapping";
import {
  parseSpreadsheet,
  pickDefaultSheet,
  type ParsedWorkbook,
} from "@/lib/helper/spreadsheet-parse";
import {
  getLeadColumnOptions,
  importLeads,
  type ImportResult,
} from "@/services/lead/lead-service";
import { getModules } from "@/services/module/module-service";
import { normalizeKey } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, FileDown, Info, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ColumnMapping } from "./column-mapping";
import { ImportDropzone } from "./import-dropzone";
import { ImportPreviewTable } from "./import-preview-table";
import { ImportResultPanel } from "./import-result-panel";
import { ImportStepper } from "./import-stepper";
import { SheetPicker } from "./sheet-picker";

export default function MasterListImportPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [moduleType, setModuleType] = useState("LEAD");

  // Only the user's explicit choices are stored; everything shown is derived
  // below, so switching module, file or sheet needs no effect to stay coherent.
  const [sheetOverride, setSheetOverride] = useState<string | null>(null);
  const [mapOverrides, setMapOverrides] = useState<
    Record<string, string | null>
  >({});
  const [newFieldTypes, setNewFieldTypes] = useState<
    Record<string, NewFieldType>
  >({});

  const { data: allModules = [] } = useQuery({
    queryKey: ["modules"],
    queryFn: getModules,
  });
  const modules = allModules.filter((m) => !m.isArchived);

  const selectedModule = modules.find((m) => m.key === moduleType);
  const recordLabel = selectedModule?.label ?? "Records";
  const recordLabelSingular = selectedModule?.labelSingular ?? "record";

  const { data: allColumns = [] } = useQuery({
    queryKey: ["board-columns", moduleType],
    queryFn: () => getLeadColumnOptions(moduleType),
  });

  const importableColumns = useMemo(
    () =>
      allColumns.filter((c) => c.name !== "History" && c.type !== "TIMELINE"),
    [allColumns]
  );

  const sheets = workbook?.sheets ?? [];
  const activeSheet =
    sheets.find((sheet) => sheet.name === sheetOverride) ??
    (sheets.length ? pickDefaultSheet(sheets) : undefined);

  const headers = activeSheet?.headers ?? [];
  const rows = activeSheet?.rows ?? [];

  const columnMap = useMemo(() => {
    const merged = autoMatchColumns(headers, importableColumns);

    for (const [header, value] of Object.entries(mapOverrides)) {
      if (value === null || value === CREATE_COLUMN) delete merged[header];
      else merged[header] = value;
    }

    return merged;
  }, [headers, importableColumns, mapOverrides]);

  // A column marked for creation carries the user's type when they picked one,
  // otherwise the type inferred from its own cells.
  const newColumnTypes = useMemo(() => {
    const types: Record<string, NewFieldType> = {};

    for (const header of headers) {
      if (mapOverrides[header] !== CREATE_COLUMN) continue;

      types[header] =
        newFieldTypes[header] ??
        inferFieldType(rows.map((row) => row[header]));
    }

    return types;
  }, [headers, rows, mapOverrides, newFieldTypes]);

  const suggestions = useMemo(() => {
    const taken = new Set(Object.values(columnMap));
    const byHeader: Record<string, ColumnSuggestion[]> = {};

    for (const header of headers) {
      if (columnMap[header] || newColumnTypes[header]) continue;
      byHeader[header] = suggestColumns(header, importableColumns, taken);
    }

    return byHeader;
  }, [headers, importableColumns, columnMap, newColumnTypes]);

  const newColumns = useMemo(
    () =>
      Object.entries(newColumnTypes).map(([header, fieldType]) => ({
        header,
        fieldName: header,
        fieldType,
      })),
    [newColumnTypes]
  );

  // A header containing "name" is the usual title column; otherwise the first.
  const nameColumn =
    mapOverrides.__nameColumn && headers.includes(mapOverrides.__nameColumn)
      ? mapOverrides.__nameColumn
      : (headers.find((h) => normalizeKey(h).includes("name")) ??
        headers[0] ??
        "");

  const importMutation = useMutation({
    mutationFn: () =>
      importLeads({
        excelData: rows,
        moduleType,
        columnMap,
        nameColumn,
        newColumns,
      }),
    onSuccess: async (res) => {
      setResult(res);
      toast.success(`${recordLabel} imported successfully`);
      clearFile();

      // Created fields exist the moment this resolves, so the board and the
      // mapping list both need the new column set.
      await queryClient.invalidateQueries({
        queryKey: ["board-columns", moduleType],
      });
      await queryClient.invalidateQueries({
        queryKey: boardQueryKey(moduleType),
      });
    },
    onError: (mutationError: Error) => {
      setError(mutationError.message ?? "Something went wrong while uploading.");
    },
  });

  const canUpload =
    !!file &&
    !isParsing &&
    !importMutation.isPending &&
    rows.length > 0 &&
    !!nameColumn &&
    Object.keys(columnMap).length + newColumns.length > 0;

  const currentStep = importMutation.isPending || result ? 3 : file ? 2 : 1;

  const clearFile = () => {
    setFile(null);
    setWorkbook(null);
    setSheetOverride(null);
    setMapOverrides({});
    setNewFieldTypes({});

    // reset the input so selecting the same file again triggers onChange
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = () => {
    clearFile();
    setError(null);
    setResult(null);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setWorkbook(null);
    setSheetOverride(null);
    setMapOverrides({});
    setNewFieldTypes({});
    setError(null);
    setResult(null);
    setIsParsing(true);

    try {
      setWorkbook(await parseSpreadsheet(selectedFile));
    } catch (parseError) {
      const message =
        parseError instanceof Error
          ? parseError.message
          : "Failed to read this file.";

      setError(message);
      toast.error(message);
    } finally {
      setIsParsing(false);
    }
  };

  // A mapping keyed by the previous sheet's headers means nothing here.
  const handleSheetChange = (name: string) => {
    setSheetOverride(name);
    setMapOverrides({});
    setNewFieldTypes({});
  };

  const handleModuleChange = (nextModuleType: string) => {
    setModuleType(nextModuleType);
    removeFile();
  };

  const handleDownloadTemplate = () => {
    const templateHeaders = importableColumns.map((column) => column.name);

    if (!templateHeaders.length) {
      toast.error(`No ${recordLabelSingular} fields available for a template.`);
      return;
    }

    downloadCSVTemplate(
      templateHeaders,
      `${recordLabel.replace(/\s+/g, "_")}_Template`
    );
  };

  return (
    <div className="page-style animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="page-title text-3xl font-bold tracking-tight sm:text-4xl">
            Import {recordLabel}
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Import your records from a CSV or Excel file. Columns are matched to
            your {recordLabelSingular} fields where the names agree, and you
            confirm or change every mapping before anything is synced.
          </p>
        </div>

        <Button onClick={handleDownloadTemplate}>
          <FileDown className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">Import into</p>
            <Select value={moduleType} onValueChange={handleModuleChange}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Select a module" />
              </SelectTrigger>
              <SelectContent>
                {modules.map((module) => (
                  <SelectItem key={module.key} value={module.key}>
                    {module.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ImportStepper
            currentStep={currentStep}
            isUploading={importMutation.isPending}
          />

          <ImportDropzone
            inputRef={inputRef}
            file={file}
            isParsing={isParsing}
            onFileChange={handleFileChange}
            onRemove={removeFile}
          />

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              <p className="text-sm leading-relaxed text-destructive">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {file && !isParsing && headers.length > 0 && (
            <div className="space-y-4">
              {sheets.length > 1 && activeSheet && (
                <SheetPicker
                  sheets={sheets}
                  value={activeSheet.name}
                  onChange={handleSheetChange}
                />
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Detected Columns</p>
                <p className="text-xs text-muted-foreground">
                  {headers.length} columns • {rows.length} rows
                </p>
              </div>

              <ColumnMapping
                headers={headers}
                columns={importableColumns}
                columnMap={columnMap}
                newColumnTypes={newColumnTypes}
                suggestions={suggestions}
                nameColumn={nameColumn}
                recordLabelSingular={recordLabelSingular}
                onMapChange={(header, value) =>
                  setMapOverrides((prev) => ({ ...prev, [header]: value }))
                }
                onNewFieldTypeChange={(header, fieldType) =>
                  setNewFieldTypes((prev) => ({ ...prev, [header]: fieldType }))
                }
                onNameColumnChange={(header) =>
                  setMapOverrides((prev) => ({ ...prev, __nameColumn: header }))
                }
              />

              {rows.length > 0 && (
                <ImportPreviewTable headers={headers} rows={rows} />
              )}
            </div>
          )}

          {result && (
            <ImportResultPanel result={result} recordLabel={recordLabel} />
          )}

          <div className="space-y-4 pt-4">
            <Button
              onClick={() => importMutation.mutate()}
              disabled={!canUpload}
              size="lg"
              className="h-12 w-full text-base font-semibold transition-all active:scale-[0.99]"
            >
              <Upload className="mr-2 h-5 w-5" />
              {importMutation.isPending ? "Uploading..." : "Upload and Sync"}
            </Button>

            <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-table-header p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <p className="text-sm leading-relaxed text-foreground">
                <strong>Note:</strong> Columns whose header matches a{" "}
                {recordLabelSingular} field are mapped for you, ignoring word
                order. A near miss is offered as a suggestion, never applied on
                your behalf. Anything left over stays on <em>Do not import</em>{" "}
                unless you map it or choose <em>Create new field</em>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
