import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { cn } from "@dashboard/ui/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
export function DateRangeFilter({
  from,
  to,
  onChange,
  className,
}: {
  from: Date | null;
  to: Date | null;
  onChange: (value: { from: Date | null; to: Date | null }) => void;
  // Layout only: the trigger goes full width in a stacked mobile toolbar.
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("flex items-center gap-2", className)}
        >
          <CalendarIcon className="w-4 h-4" />
          {from && to
            ? `${format(from, "MM/dd/yyyy")} - ${format(to, "MM/dd/yyyy")}`
            : "Filter by date"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: from ?? undefined, to: to ?? undefined }}
          onSelect={(range) =>
            onChange({
              from: range?.from ?? null,
              to: range?.to ?? null,
            })
          }
        />
      </PopoverContent>
    </Popover>
  );
}
