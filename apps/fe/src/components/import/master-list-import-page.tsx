import { AlertCircle, CheckCircle2, FileText, Upload, X } from "lucide-react";
import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";

import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { cn, isValidHeader, normalizeHeader } from "@/lib/utils";
import { importLeads } from "@/services/lead/lead-service";
import { toast } from "sonner";

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

  const removeFile = () => {
    setFile(null);
    setHeaders([]);
    setRows([]);
    setError(null);
    setResult(null);

    // reset the input so selecting the same file again triggers onChange
    if (inputRef.current) inputRef.current.value = "";
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

      removeFile();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong while uploading.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-12 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Master List
        </h1>
        <p className="text-lg text-muted-foreground">
          Import your data records using CSV files. We&apos;ll detect headers
          and let the backend match them to your Lead Fields.
        </p>
      </div>

      <Card className="border-2 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Upload Data</CardTitle>
              <CardDescription className="text-base">
                Select a CSV file. We’ll preview columns and rows before you
                sync.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Dropzone Area */}
          {!file ? (
            <div className="group relative">
              <label
                htmlFor="file-upload"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-72",
                  "border-2 border-dashed rounded-2xl cursor-pointer",
                  "bg-muted/30 border-muted-foreground/20",
                  "group-hover:bg-muted/50 group-hover:border-primary/50 transition-all duration-300"
                )}
              >
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="p-4 bg-background rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="text-base text-foreground mb-1">
                    <span className="font-semibold text-primary underline underline-offset-4">
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
                    <thead className="bg-muted/40">
                      <tr>
                        {headers.map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, maxPreviewRows).map((row, i) => (
                        <tr key={i} className="border-t">
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
              className="w-full text-lg font-bold h-14 shadow-xl shadow-primary/10 active:scale-[0.99] transition-all"
            >
              <Upload className="mr-2 h-5 w-5" />
              {isUploading ? "Uploading..." : "Upload and Sync Master List"}
            </Button>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 leading-relaxed">
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
