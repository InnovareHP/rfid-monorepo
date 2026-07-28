import type { OptionsResponse } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Download, Filter, Loader2, RefreshCcw } from "lucide-react";

type MarketingFiltersProps = {
  liaisons: OptionsResponse[];
  selectedLiaison: string | null;
  onSelectLiaison: (userId: string) => void;
  onApply: () => void;
  onReset: () => void;
  onExport: () => void;
  canReset: boolean;
  canExport: boolean;
  isExporting: boolean;
};

export function MarketingFilters({
  liaisons,
  selectedLiaison,
  onSelectLiaison,
  onApply,
  onReset,
  onExport,
  canReset,
  canExport,
  isExporting,
}: MarketingFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={selectedLiaison ?? undefined}
        onValueChange={onSelectLiaison}
      >
        <SelectTrigger className="h-10 w-[220px] rounded-lg">
          <SelectValue placeholder="All liaisons" />
        </SelectTrigger>
        <SelectContent>
          {liaisons.length > 0 ? (
            liaisons.map((liaison) => (
              <SelectItem key={liaison.id} value={liaison.id}>
                {liaison.value}
              </SelectItem>
            ))
          ) : (
            <div className="p-2 text-sm text-muted-foreground">
              No liaisons available
            </div>
          )}
        </SelectContent>
      </Select>

      <Button
        onClick={onApply}
        className="h-10 rounded-lg bg-brand hover:bg-brand/90"
      >
        <Filter className="size-4" aria-hidden="true" />
        Apply Filters
      </Button>

      <Button
        variant="outline"
        onClick={onReset}
        disabled={!canReset}
        className="h-10 rounded-lg"
      >
        <RefreshCcw className="size-4" aria-hidden="true" />
        Reset
      </Button>

      <Button
        variant="outline"
        onClick={onExport}
        disabled={!canExport}
        className="ml-auto h-10 rounded-lg"
      >
        {isExporting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {isExporting ? "Exporting..." : "Export PDF"}
      </Button>
    </div>
  );
}
