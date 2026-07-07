import {
  getDropdownOptions,
  getLeadRecords,
} from "@/services/lead/lead-service";
import type { OptionsResponse } from "@dashboard/shared";
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

const CLEAR_VALUE = "__clear__";

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
    filterMeta.filter[col.id] ?? ""
  );

  const handleChange = (value: string) => {
    const next = value === CLEAR_VALUE ? "" : value;
    setLocalValue(next);
    updateFilter(col.id, next);
  };

  const hasOptions =
    col.type === "DROPDOWN" ||
    col.type === "STATUS" ||
    col.type === "MULTISELECT";

  const { data: options = [] } = useQuery({
    queryKey: ["dropdown-options", col.id],
    queryFn: () => getDropdownOptions(col.id),
    enabled: hasOptions,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
  });

  const { data: facilityRecords = [] } = useQuery({
    queryKey: ["lead-records", 1, 500],
    queryFn: () => getLeadRecords(1, 500),
    enabled: col.type === "REFERRAL_LINK",
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
  });

  switch (col.type) {
    case "NUMBER":
      return (
        <Input
          type="number"
          placeholder={`Filter by ${col.name}`}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      );

    case "DATE":
      return (
        <Input
          type="date"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      );

    case "CHECKBOX":
      return (
        <Select value={localValue || undefined} onValueChange={handleChange}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder={`Filter by ${col.name}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CLEAR_VALUE}>Any</SelectItem>
            <SelectItem value="true">Checked</SelectItem>
            <SelectItem value="false">Unchecked</SelectItem>
          </SelectContent>
        </Select>
      );

    case "REFERRAL_LINK":
      return (
        <Select value={localValue || undefined} onValueChange={handleChange}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder={`Filter by ${col.name}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CLEAR_VALUE}>Any</SelectItem>
            {facilityRecords.map((record: { id: string; value: string }) => (
              <SelectItem key={record.id} value={record.value}>
                {record.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "DROPDOWN":
    case "STATUS":
    case "MULTISELECT":
      return (
        <Select value={localValue || undefined} onValueChange={handleChange}>
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder={`Filter by ${col.name}`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={CLEAR_VALUE}>Any</SelectItem>
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
