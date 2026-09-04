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
import { useState, type ReactNode } from "react";

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
  // A node, not a string: a link field's empty state offers a way to create
  // the missing record rather than just saying it is missing.
  emptyText: ReactNode;
  className?: string;
  // Lets a caller hold its query back until the list is actually opened.
  onOpenChange?: (open: boolean) => void;
  // Sits below the list, so an option-backed field can offer to add the value
  // the user searched for even when the search did match something. Takes the
  // close callback because only this component owns the open state.
  footer?: (close: () => void) => ReactNode;
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
  onOpenChange,
  footer,
}: SearchableSelectProps) => {
  const [open, setOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("");

  const label =
    options.find((option) => option.value === value)?.label ||
    selectedLabel ||
    valueLabel ||
    "";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        onOpenChange?.(next);
      }}
    >
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
          {footer && (
            <div className="border-t">{footer(() => setOpen(false))}</div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
