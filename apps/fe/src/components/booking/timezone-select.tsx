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
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

const offsetLabel = (zone: string) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    timeZoneName: "shortOffset",
  }).formatToParts(new Date());

  return parts.find((part) => part.type === "timeZoneName")?.value ?? "";
};

type TimezoneSelectProps = {
  value: string;
  suggested: string[];
  onChange: (zone: string) => void;
  id?: string;
};

// Searchable picker over the browser's IANA list so no zone is ever typed by hand.
export const TimezoneSelect = ({
  value,
  suggested,
  onChange,
  id,
}: TimezoneSelectProps) => {
  const [open, setOpen] = useState(false);

  const zones = [
    ...suggested.filter(Boolean),
    ...Intl.supportedValuesOf("timeZone").filter(
      (zone) => !suggested.includes(zone)
    ),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white font-normal"
        >
          <span className="truncate">{value || "Select a timezone"}</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            {offsetLabel(value)}
            <ChevronsUpDown className="size-4 opacity-60" />
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search timezone..." />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {zones.map((zone) => (
                <CommandItem
                  key={zone}
                  value={zone}
                  onSelect={() => {
                    onChange(zone);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={
                      zone === value
                        ? "mr-2 size-4 opacity-100"
                        : "mr-2 size-4 opacity-0"
                    }
                  />
                  <span className="truncate">{zone}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {offsetLabel(zone)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
