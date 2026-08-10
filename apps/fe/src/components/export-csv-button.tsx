import { useEntitlement } from "@/hooks/use-entitlement";
import { Button } from "@dashboard/ui/components/button";
import { Label } from "@dashboard/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { Input } from "@dashboard/ui/components/input";
import { useRouteContext } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { useState } from "react";

export type ExportRange = { from?: string; to?: string };

type ExportCsvButtonProps = {
  onExport: (range: ExportRange) => void;
  label?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
};

// One gate for every export surface. The plan check lived on the master list
// alone, so four other buttons shipped the feature to plans that had not bought
// it. Soft by nature: the rows are already in the browser, so this states the
// entitlement rather than enforcing it.
export const ExportCsvButton = ({
  onExport,
  label = "Export CSV",
  variant,
  className,
}: ExportCsvButtonProps) => {
  const { activeOrganizationId } = useRouteContext({ from: "__root__" }) as {
    activeOrganizationId: string | null;
  };
  const entitled = useEntitlement(activeOrganizationId ?? "").has("export");

  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const invalid = Boolean(from && to && from > to);

  const runExport = () => {
    onExport({ from: from || undefined, to: to || undefined });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={variant}
          disabled={!entitled}
          title={entitled ? undefined : "Upgrade your plan to export data"}
          className={className}
        >
          <Download className="h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Date range</p>
          <p className="text-xs text-muted-foreground">
            Leave both empty to export every row.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="export-from">From</Label>
          <Input
            id="export-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="export-to">To</Label>
          <Input
            id="export-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>

        {invalid && (
          <p className="text-xs text-destructive">
            From must be on or before To.
          </p>
        )}

        <Button onClick={runExport} disabled={invalid} className="w-full">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </PopoverContent>
    </Popover>
  );
};
