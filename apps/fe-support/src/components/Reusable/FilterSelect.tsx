import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { cn } from "@dashboard/ui/lib/utils";

export type FilterOption = { label: string; value: string };

// Every admin list filters the same way: one select, an "ALL" option first,
// and page reset on change, which the caller does in onValueChange.
export function FilterSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly FilterOption[];
  placeholder: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("w-[170px]", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
