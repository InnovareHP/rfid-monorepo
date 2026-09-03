import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

export type AnalyticsDateRange = { start: Date | null; end: Date | null };

type AnalyticsDateFilterProps = {
  onChange: (value: AnalyticsDateRange) => void;
};

export function AnalyticsDateFilter({ onChange }: AnalyticsDateFilterProps) {
  const [range, setRange] = useState<AnalyticsDateRange>({
    start: null,
    end: null,
  });

  const handleSelect = (selected: DateRange | undefined) => {
    const next = {
      start: selected?.from ?? null,
      end: selected?.to ?? null,
    };
    setRange(next);
    onChange(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-10 w-full justify-between rounded-lg text-left font-normal sm:w-[280px]"
        >
          {range.start ? (
            <span className="font-medium text-foreground">
              {format(range.start, "LLL dd, y")}
              {range.end ? ` — ${format(range.end, "LLL dd, y")}` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">Select Date Range</span>
          )}
          <CalendarIcon className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          selected={{
            from: range.start ?? undefined,
            to: range.end ?? undefined,
          }}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
