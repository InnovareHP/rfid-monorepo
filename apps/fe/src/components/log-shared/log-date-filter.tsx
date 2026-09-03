import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import type { DateRange } from "react-day-picker";

type LogDateFilterProps = {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
};

export function LogDateFilter({ value, onChange }: LogDateFilterProps) {
  const hasRange = !!value?.from;

  return (
    <div className="flex items-center gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="h-9 w-full justify-between gap-2 font-normal sm:w-[260px]"
          >
            {hasRange ? (
              <span className="truncate font-medium text-foreground">
                {format(value.from as Date, "LLL dd, y")}
                {value?.to ? ` — ${format(value.to, "LLL dd, y")}` : ""}
              </span>
            ) : (
              <span className="text-muted-foreground">Filter by date</span>
            )}
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {hasRange && (
        <Button
          variant="ghost"
          size="sm"
          aria-label="Clear date filter"
          className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
          onClick={() => onChange(undefined)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
