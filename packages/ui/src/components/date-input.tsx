import { Button } from "./button";
import { Calendar } from "./calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover";
import { format } from "date-fns";
import { useState } from "react";

export function DateRangePicker({
  onChange,
}: {
  onChange?: (range: { from: Date; to: Date }) => void;
}) {
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});

  const handleSelect = (selected: any) => {
    setRange(selected);
    if (selected?.from && selected?.to) {
      onChange?.(selected);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[260px] justify-between">
          {range.from ? (
            range.to ? (
              <>
                {format(range.from, "MMM dd, yyyy")} –{" "}
                {format(range.to, "MMM dd, yyyy")}
              </>
            ) : (
              format(range.from, "MMM dd, yyyy")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: range.from, to: range.to }}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
