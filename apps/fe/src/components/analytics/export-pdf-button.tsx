import { Button } from "@dashboard/ui/components/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type ExportPdfButtonProps = {
  onExport: () => Promise<void>;
  disabled?: boolean;
};

// Every analytics page exports the same way, so the pending state and the
// toasts live here rather than being rebuilt on each page.
export function ExportPdfButton({ onExport, disabled }: ExportPdfButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleClick = async () => {
    setIsExporting(true);
    try {
      await onExport();
      toast.success("Report downloaded");
    } catch {
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      disabled={disabled || isExporting}
      className="h-10 rounded-lg"
    >
      {isExporting ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      {isExporting ? "Exporting..." : "Export PDF"}
    </Button>
  );
}
