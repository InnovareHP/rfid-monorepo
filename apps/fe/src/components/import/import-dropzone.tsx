import { ACCEPTED_IMPORT_FILES } from "@/lib/helper/spreadsheet-parse";
import { Button } from "@dashboard/ui/components/button";
import { cn } from "@dashboard/ui/lib/utils";
import { CheckCircle2, Download, FileText, X } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

type Props = {
  inputRef: RefObject<HTMLInputElement | null>;
  file: File | null;
  isParsing: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
};

export function ImportDropzone({
  inputRef,
  file,
  isParsing,
  onFileChange,
  onRemove,
}: Props) {
  if (!file) {
    return (
      <div className="group relative">
        <label
          htmlFor="file-upload"
          className={cn(
            "flex h-72 w-full flex-col items-center justify-center",
            "cursor-pointer rounded-xl border border-dashed",
            "border-border bg-card",
            "transition-all duration-300 group-hover:border-primary/50 group-hover:bg-muted"
          )}
        >
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-transform duration-300 group-hover:scale-110">
              <Download className="size-8 text-brand" />
            </div>
            <p className="mb-1 text-base text-foreground">
              <span className="font-semibold text-brand">Click to browse</span>{" "}
              or drag and drop your file
            </p>
            <p className="text-sm text-muted-foreground">
              CSV or Excel .xlsx (max size: 10MB)
            </p>
          </div>
          <input
            ref={inputRef}
            id="file-upload"
            type="file"
            className="hidden"
            accept={ACCEPTED_IMPORT_FILES}
            onChange={onFileChange}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-accent/20 p-6 animate-in zoom-in-95 duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-5">
          <div className="rounded-xl border border-primary/10 bg-background p-4 shadow-sm">
            <FileText className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="break-all text-base font-bold text-foreground">
              {file.name}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB •{" "}
              {isParsing ? "Parsing..." : "Ready"}
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/15 px-2.5 py-0.5 text-xs font-bold text-success">
              <CheckCircle2 className="h-3 w-3" />
              {isParsing ? "Processing" : "Validated"}
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 rounded-full transition-colors hover:bg-destructive hover:text-destructive-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
