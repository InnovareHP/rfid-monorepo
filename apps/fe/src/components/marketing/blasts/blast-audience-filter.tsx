import { FilterComponent } from "@/components/master-list/filter-component";
import {
  getBoardFieldsByModule,
  type AudienceFilter,
} from "@/services/marketing/blast-service";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { useQuery } from "@tanstack/react-query";

type BlastAudienceFilterProps = {
  moduleType: string;
  audienceFilter: AudienceFilter;
  onChange: (audienceFilter: AudienceFilter) => void;
};

export const BlastAudienceFilter = ({
  moduleType,
  audienceFilter,
  onChange,
}: BlastAudienceFilterProps) => {
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

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="blast-audience-search">Search</Label>
        <Input
          id="blast-audience-search"
          placeholder="Search by name or value"
          value={audienceFilter.search ?? ""}
          onChange={(event) =>
            onChange({ ...audienceFilter, search: event.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="blast-audience-date-from">Created from</Label>
          <Input
            id="blast-audience-date-from"
            type="date"
            value={audienceFilter.boardDateFrom ?? ""}
            onChange={(event) =>
              onChange({ ...audienceFilter, boardDateFrom: event.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="blast-audience-date-to">Created to</Label>
          <Input
            id="blast-audience-date-to"
            type="date"
            value={audienceFilter.boardDateTo ?? ""}
            onChange={(event) =>
              onChange({ ...audienceFilter, boardDateTo: event.target.value })
            }
          />
        </div>
      </div>

      {fields.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((col) => (
            <div key={col.id} className="space-y-1.5">
              <Label>{col.name}</Label>
              <FilterComponent
                col={col}
                filterMeta={{ filter: audienceFilter.filter }}
                updateFilter={updateFilter}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
