import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileDown,
  FileText,
  Info,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import Papa from "papaparse";
import { Fragment, useMemo, useRef, useState } from "react";

import { downloadCSVTemplate } from "@/lib/fe-helpers";
import {
  getLeadColumnOptions,
  importLeads,
} from "@/services/lead/lead-service";
import { isValidHeader, normalizeHeader } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { cn } from "@dashboard/ui/lib/utils";
import { toast } from "sonner";

const IMPORT_STEPS = [
  { title: "Upload File", caption: "Add your CSV File" },
  { title: "Review Data", caption: "Preview and Validate" },
  { title: "Import", caption: "Sync and Complete" },
];

export default function MasterListImportPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);

  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    imported?: number;
    createdOptions?: number;
    unmatchedColumns?: string[];
  } | null>(null);

  const maxPreviewRows = 5;

  const normalizedRowsCount = useMemo(() => rows.length, [rows]);

  const currentStep = isUploading || result ? 3 : file ? 2 : 1;

  const clearFile = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);

    // reset the input so selecting the same file again triggers onChange
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = () => {
    clearFile();
    setError(null);
    setResult(null);
  };

  const parseCSV = (f: File) => {
    setIsParsing(true);
    setError(null);
    setResult(null);

    Papa.parse<Record<string, any>>(f, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (results) => {
        const rawHeaders = (results.meta.fields ?? [])
          .filter(Boolean)
          .map((h) => normalizeHeader(h));

        const cleanedHeaders = rawHeaders.filter(isValidHeader);

        const cleanedRows = (results.data ?? [])
          .map((row) => {
            if (!row) return null;

            return Object.fromEntries(
              Object.entries(row)
                .map(([key, value]) => [normalizeHeader(key), value])
                .filter(([key]) => isValidHeader(key))
            );
          })
          .filter(
            (r) =>
              r &&
              Object.values(r).some(
                (v) => v !== null && v !== undefined && String(v).trim() !== ""
              )
          ) as Record<string, any>[];

        setHeaders(cleanedHeaders);
        setRows(cleanedRows);
        setIsParsing(false);

        if (!cleanedHeaders.length) {
          setError(
            "No valid column headers detected. Please check your CSV file."
          );
        }
      },
      error: (err) => {
        setIsParsing(false);
        setError(err?.message ?? "Failed to parse CSV.");
      },
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const handleDownloadTemplate = async () => {
    const columns: { name: string }[] = await getLeadColumnOptions();
    const headers = columns
      .map((column) => column.name)
      .filter((name) => name !== "History");

    if (!headers.length) {
      toast.error("No lead fields available for a template.");
      return;
    }

    downloadCSVTemplate(headers, "Master_List_Template");
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!rows.length) {
      setError("No rows detected. Please check your CSV content.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      const res = await importLeads(rows);
      setResult(res);

      toast.success("Leads imported successfully");

      clearFile();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong while uploading.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-12 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="page-title text-3xl font-bold tracking-tight sm:text-4xl">
            Import Master List
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Import your data records using CSV files. We&apos;ll detect headers
            and let the backend match them to your Lead Fields. You&apos;ll be
            able to review and confirm before anything is synced.
          </p>
        </div>

        <Button
          onClick={handleDownloadTemplate}
          className="bg-brand text-white hover:bg-brand/90"
        >
          <FileDown className="h-4 w-4" />
          Download Template
        </Button>
      </div>

      <Card className="shadow-sm">
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            {IMPORT_STEPS.map((step, index) => (
              <Fragment key={step.title}>
                {index > 0 && (
                  <div
                    className={cn(
                      "h-px flex-1 transition-colors duration-300",
                      index < currentStep ? "bg-primary" : "bg-gray-300"
                    )}
                  />
                )}
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white transition-colors duration-300",
                      index < currentStep ? "bg-primary" : "bg-gray-400"
                    )}
                  >
                    {index + 1 === currentStep && isUploading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {step.caption}
                    </p>
                  </div>
                </div>
              </Fragment>
            ))}
          </div>

          {/* Dropzone Area */}
          {!file ? (
            <div className="group relative">
              <label
                htmlFor="file-upload"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-72",
                  "border border-dashed rounded-xl cursor-pointer",
                  "bg-white border-gray-300",
                  "group-hover:bg-gray-50 group-hover:border-primary/50 transition-all duration-300"
                )}
              >
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="mb-4 flex size-20 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Download className="size-8 text-brand" />
                  </div>
                  <p className="text-base text-foreground mb-1">
                    <span className="font-semibold text-brand">
                      Click to browse
                    </span>{" "}
                    or drag and drop your file
                  </p>
                  <p className="text-sm text-muted-foreground">
                    CSV (Max size: 10MB)
                  </p>
                </div>
                <input
                  ref={inputRef}
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          ) : (
            /* Selected File Preview */
            <div className="relative overflow-hidden rounded-2xl border bg-accent/20 p-6 animate-in zoom-in-95 duration-300">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-5">
                  <div className="bg-background p-4 rounded-xl shadow-sm border border-primary/10">
                    <FileText className="h-10 w-10 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold text-foreground break-all">
                      {file.name}
                    </p>
                    <p className="text-sm text-muted-foreground font-medium">
                      {(file.size / 1024 / 1024).toFixed(2)} MB •{" "}
                      {isParsing ? "Parsing..." : "Ready"}
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      {isParsing ? "Processing" : "Validated"}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={removeFile}
                  className="rounded-full h-8 w-8 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive leading-relaxed">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {/* Parsed Info */}
          {file && !isParsing && headers.length > 0 && (
            <div className="space-y-4">
              {/* Headers chips */}
              <div className="rounded-xl border p-4 bg-muted/20">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">Detected Columns</p>
                  <p className="text-xs text-muted-foreground">
                    {headers.length} columns • {normalizedRowsCount} rows
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {headers.map((h) => (
                    <span
                      key={h}
                      className="px-2.5 py-1 rounded-md bg-background border text-xs font-medium"
                      title={h}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              {rows.length > 0 && (
                <div className="rounded-xl border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {headers.map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, maxPreviewRows).map((row, i) => (
                        <tr
                          key={i}
                          className="border-t border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                          {headers.map((h) => (
                            <td key={h} className="px-3 py-2 whitespace-nowrap">
                              {row?.[h] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-muted-foreground p-2">
                    Showing first {Math.min(maxPreviewRows, rows.length)} rows
                    only.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Upload Result */}
          {result && (
            <div className="rounded-xl border p-4 bg-emerald-50/60">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-700 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-emerald-900">
                    Import complete
                  </p>
                  <p className="text-sm text-emerald-900/80">
                    Imported <strong>{result.imported ?? 0}</strong> leads.
                    {typeof result.createdOptions === "number" && (
                      <>
                        {" "}
                        Created <strong>{result.createdOptions}</strong> new
                        options.
                      </>
                    )}
                  </p>
                  {!!result.unmatchedColumns?.length && (
                    <p className="text-xs text-emerald-900/80">
                      Unmatched columns:{" "}
                      <strong>{result.unmatchedColumns.join(", ")}</strong>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 space-y-4">
            <Button
              onClick={handleUpload}
              disabled={!file || isParsing || isUploading || !rows.length}
              size="lg"
              className="h-12 w-full bg-brand text-base font-semibold text-white transition-all hover:bg-brand/90 active:scale-[0.99]"
            >
              <Upload className="mr-2 h-5 w-5" />
              {isUploading ? "Uploading..." : "Upload and Sync"}
            </Button>

            <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-[#F4F9FF] p-4">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
              <p className="text-sm leading-relaxed text-gray-700">
                <strong>Note:</strong> The backend will match your CSV column
                headers to Lead Fields by name (fuzzy match), then use the field
                type from the database to validate values and create missing
                options.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
