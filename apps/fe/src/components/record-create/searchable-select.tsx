import { Button } from "@dashboard/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@dashboard/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import { cn } from "@dashboard/ui/lib/utils";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";

// Option-backed fields submit the option text; link fields submit the target
// record id and show its name, so label and value are kept apart.
export type SearchableOption = { id: string; label: string; value: string };

type SearchableSelectProps = {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  // Shown when the current value is not on the fetched page; option-backed
  // fields pass the value itself, link fields have no readable stand-in.
  valueLabel?: string;
  search: string;
  onSearchChange: (search: string) => void;
  isLoading?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  className?: string;
};

// Type-to-filter picker. The list comes back already filtered by the server, so
// Command must not filter it a second time.
export const SearchableSelect = ({
  options,
  value,
  onChange,
  valueLabel,
  search,
  onSearchChange,
  isLoading,
  placeholder,
  searchPlaceholder,
  emptyText,
  className,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  const label =
    options.find((option) => option.value === value)?.label ||
    selectedLabel ||
    valueLabel ||
    "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-background font-normal",
            !label && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{label || placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={onSearchChange}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Searching...
                </span>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setSelectedLabel(option.label);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      option.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
