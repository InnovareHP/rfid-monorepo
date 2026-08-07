import { FilterComponent } from "@/components/master-list/filter-component";
import { getBoardFieldsByModule } from "@/services/marketing/blast-service";
import type { AudienceFilter } from "@/services/marketing/group-service";
import { DatePicker } from "@dashboard/ui/components/date-picker";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";

type GroupAudienceFilterProps = {
  moduleType: string;
  audienceFilter: AudienceFilter;
  onChange: (audienceFilter: AudienceFilter) => void;
};

function GroupHeading({ title }: { title: string }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      <div className="mt-2 border-b border-gray-200" />
    </div>
  );
}

export const GroupAudienceFilter = ({
  moduleType,
  audienceFilter,
  onChange,
}: GroupAudienceFilterProps) => {
  const { data: fields = [] } = useQuery({
    queryKey: ["board-fields-by-module", moduleType],
    queryFn: () => getBoardFieldsByModule(moduleType),
  });

  const updateFilter = (fieldId: string, value: string) => {
    const nextFilter = { ...audienceFilter.filter };
    if (value) {
      nextFilter[fieldId] = value;
    } else {
      delete nextFilter[fieldId];
    }
    onChange({ ...audienceFilter, filter: nextFilter });
  };

  const hasFilters =
    Object.keys(audienceFilter.filter).length > 0 ||
    Boolean(audienceFilter.search) ||
    Boolean(audienceFilter.boardDateFrom) ||
    Boolean(audienceFilter.boardDateTo);

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <GroupHeading title="Search and Date Range" />

        <div className="space-y-2">
          <Label htmlFor="group-audience-search">Search</Label>
          <div className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="group-audience-search"
              placeholder="Search by name or value..."
              className="pl-9"
              value={audienceFilter.search ?? ""}
              onChange={(event) =>
                onChange({ ...audienceFilter, search: event.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Created From</Label>
            <DatePicker
              value={audienceFilter.boardDateFrom}
              onChange={(value) =>
                onChange({ ...audienceFilter, boardDateFrom: value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Created To</Label>
            <DatePicker
              value={audienceFilter.boardDateTo}
              onChange={(value) =>
                onChange({ ...audienceFilter, boardDateTo: value })
              }
            />
          </div>
        </div>
      </section>

      {fields.length > 0 && (
        <section className="space-y-4">
          <GroupHeading title="Record Fields" />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((col) => (
              <div key={col.id} className="space-y-2">
                <Label>{col.name}</Label>
                <FilterComponent
                  col={col}
                  filterMeta={{ filter: audienceFilter.filter }}
                  updateFilter={updateFilter}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {hasFilters && (
        <button
          type="button"
          onClick={() => onChange({ filter: {} })}
          className="text-sm font-medium text-primary hover:underline"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
};
