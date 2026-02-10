import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, FileText, Upload, X } from "lucide-react";
import { useState } from "react";

export default function ReferralListImportPage() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    }
  };

  const removeFile = () => setFile(null);

  const handleUpload = () => {
    if (file) {
      console.log("Uploading:", file.name);
    }
  };

  return (
    <div className="container max-w-3xl mx-auto py-12 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
          Referral List
        </h1>
        <p className="text-lg text-muted-foreground">
          Import your referral data records using CSV or Excel files.
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
                Select the file you wish to process and sync with the referral
                records.
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
                    CSV, XLSX, or XLS (Max size: 10MB)
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
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
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Ready for
                      processing
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      Validated
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

          {/* Action Footer */}
          <div className="pt-4 space-y-4">
            <Button
              onClick={handleUpload}
              disabled={!file}
              size="lg"
              className="w-full text-lg font-bold h-14 shadow-xl shadow-primary/10 active:scale-[0.99] transition-all"
            >
              <Upload className="mr-2 h-5 w-5" />
              Upload and Sync Referral List
            </Button>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 leading-relaxed">
                <strong>Attention:</strong> Uploading will overwrite existing
                data for matching records. Please ensure your column headers
                match the referral template before proceeding.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
