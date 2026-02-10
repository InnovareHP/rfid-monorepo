import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
export function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from: Date | null;
  to: Date | null;
  onChange: (value: { from: Date | null; to: Date | null }) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          {from && to
            ? `${format(from, "MM/dd/yyyy")} - ${format(to, "MM/dd/yyyy")}`
            : "Filter by date"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="p-4" align="start">
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
