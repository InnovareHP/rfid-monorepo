import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@dashboard/ui/lib/utils";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type DatePickerProps = {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

// Single-date picker storing yyyy-MM-dd, shown as a long date.
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a Date",
  disabled,
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          {value ? format(new Date(value), "MMMM d, yyyy") : placeholder}
          <CalendarIcon className="size-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
        />
      </PopoverContent>
    </Popover>
  );
}
