import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/reusable-table/searchable-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toFieldOptions } from "@/lib/helper/field-options";
import { getLinkCandidates } from "@/services/board/board-module-service";
import {
  getDropdownOptions,
  getLeadRecords,
} from "@/services/lead/lead-service";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

const CLEAR_VALUE = "__clear__";
const PICKER_LIMIT = 10;

// Every filter can be cleared, so "Any" rides along as the first choice.
const ANY_OPTION: SearchableOption = {
  id: CLEAR_VALUE,
  label: "Any",
  value: "",
};

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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  // The sheet mounts every column at once, so nothing is fetched until opened.
  const [wasOpened, setWasOpened] = useState(false);

  const handleChange = (value: string) => {
    const next = value === CLEAR_VALUE ? "" : value;
    setLocalValue(next);
    updateFilter(col.id, next);
  };

  const hasOptions =
    col.type === "DROPDOWN" ||
    col.type === "STATUS" ||
    col.type === "MULTISELECT";

  const { data: optionsResponse, isFetching: isFetchingOptions } = useQuery({
    queryKey: ["dropdown-options", col.id, debouncedSearch],
    queryFn: () => getDropdownOptions(col.id, 1, PICKER_LIMIT, debouncedSearch),
    enabled: hasOptions && wasOpened,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 30,
  });

  const isLinkType =
    col.type === "REFERRAL_LINK" ||
    col.type === "CONTACT_LINK" ||
    col.type === "COMPANY_LINK";

  const linkTargetModule =
    col.type === "CONTACT_LINK"
      ? "CONTACT"
      : col.type === "COMPANY_LINK"
        ? "COMPANY"
        : "LEAD";

  const { data: linkRecords = [], isFetching: isFetchingLinks } = useQuery({
    queryKey: ["link-records", linkTargetModule, debouncedSearch],
    queryFn: () =>
      linkTargetModule === "LEAD"
        ? getLeadRecords(1, PICKER_LIMIT, debouncedSearch)
        : getLinkCandidates(linkTargetModule, 1, PICKER_LIMIT, debouncedSearch),
    enabled: isLinkType && wasOpened,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 30,
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
    case "CONTACT_LINK":
    case "COMPANY_LINK":
      return (
        <SearchableSelect
          options={[
            ANY_OPTION,
            ...linkRecords.map((record: { id: string; value: string }) => ({
              id: record.id,
              label: record.value,
              value: record.value,
            })),
          ]}
          value={localValue}
          onChange={handleChange}
          valueLabel={localValue}
          search={search}
          onSearchChange={setSearch}
          isLoading={isFetchingLinks}
          placeholder={`Filter by ${col.name}`}
          searchPlaceholder={`Search ${col.name}...`}
          emptyText="No records found"
          onOpenChange={(open) => open && setWasOpened(true)}
        />
      );

    case "DROPDOWN":
    case "STATUS":
    case "MULTISELECT":
      return (
        <SearchableSelect
          options={[
            ANY_OPTION,
            ...toFieldOptions(optionsResponse).map((option) => ({
              id: option.id,
              label: option.value,
              value: option.value,
            })),
          ]}
          value={localValue}
          onChange={handleChange}
          valueLabel={localValue}
          search={search}
          onSearchChange={setSearch}
          isLoading={isFetchingOptions}
          placeholder={`Filter by ${col.name}`}
          searchPlaceholder={`Search ${col.name}...`}
          emptyText="No options found"
          onOpenChange={(open) => open && setWasOpened(true)}
        />
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
