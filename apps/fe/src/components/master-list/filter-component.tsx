import type { OptionsResponse } from "@/lib/types";
import { getDropdownOptions } from "@/services/lead/lead-service";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function FilterComponent({
  col,
  filterMeta,
  updateFilter,
}: {
  col: {
    id: string;
    name: string;
    type: string;
  };
  filterMeta: any;
  updateFilter: (name: string, value: any) => void;
}) {
  const [localValue, setLocalValue] = useState(
    filterMeta.filter[col.name] ?? ""
  );

  const handleChange = (value: string) => {
    setLocalValue(value);
    updateFilter(col.id, value);
  };

  const { data: options = [] } = useQuery({
    queryKey: ["dropdown-options", col.id],
    queryFn: () => getDropdownOptions(col.id),
    enabled: col.type === "DROPDOWN",
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
  });

  switch (col.type) {
    case "TEXT":
    case "EMAIL":
    case "PHONE":
      return (
        <Input
          placeholder={`Filter by ${col.name}`}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      );

    case "NUMBER":
      return (
        <Input
          type="number"
          placeholder={`Filter by ${col.name}`}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      );
    case "DROPDOWN":
      return (
        <Select defaultValue={localValue} onValueChange={handleChange}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder={`Filter by ${col.name}`} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option: OptionsResponse) => (
              <SelectItem key={option.id} value={option.value}>
                {option.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    default:
      return (
        <Input
          placeholder={`Filter by ${col.name}`}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      );
  }
}
