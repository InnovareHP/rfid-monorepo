import {
  formatCapitalize,
  getStatusLabel,
  Priority,
  TicketCategory,
  TicketStatus,
  statusConfig,
} from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Filter, X } from "lucide-react";

export interface FilterValues {
  status: string;
  category: string;
  priority: string;
}

const DEFAULT_FILTERS: FilterValues = {
  status: "ALL",
  category: "ALL",
  priority: "ALL",
};

interface TicketFiltersProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
}

export function TicketFilters({ filters, onChange }: TicketFiltersProps) {
  const activeCount = Object.values(filters).filter((v) => v !== "ALL").length;

  const handleChange = (key: keyof FilterValues, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const handleClear = () => {
    onChange(DEFAULT_FILTERS);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <Badge className="ml-1 h-5 min-w-5 rounded-full px-1.5 text-xs">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Filters</h4>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-auto px-2 py-1 text-xs text-muted-foreground"
              >
                <X className="mr-1 h-3 w-3" />
                Clear all
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <Select
                value={filters.status}
                onValueChange={(v) => handleChange("status", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {Object.values(TicketStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${statusConfig[s]?.dot ?? "bg-gray-400"}`}
                        />
                        {getStatusLabel(s)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Category
              </label>
              <Select
                value={filters.category}
                onValueChange={(v) => handleChange("category", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {Object.values(TicketCategory).map((c) => (
                    <SelectItem key={c} value={c}>
                      {formatCapitalize(c.toLowerCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Priority
              </label>
              <Select
                value={filters.priority}
                onValueChange={(v) => handleChange("priority", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All priorities</SelectItem>
                  {Object.values(Priority).map((p) => (
                    <SelectItem key={p} value={p}>
                      {formatCapitalize(p.toLowerCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
