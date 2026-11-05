import { FilterComponent } from "@/components/master-list/filter-component";
import {
  defaultFilterOperator,
  FILTER_OPERATOR_LABELS,
  FILTER_OPERATORS,
  operatorNeedsValue,
  type FilterOperator,
} from "@dashboard/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { memo } from "react";

type GroupFieldConditionProps = {
  col: { id: string; name: string; type: string };
  filter: Record<string, string>;
  operator?: FilterOperator;
  onValueChange: (fieldId: string, value: string) => void;
  onOperatorChange: (fieldId: string, operator: FilterOperator) => void;
};

// One "<field> <operator> <value>" row, e.g. Email is not jane@acme.com.
export const GroupFieldCondition = memo(function GroupFieldCondition({
  col,
  filter,
  operator,
  onValueChange,
  onOperatorChange,
}: GroupFieldConditionProps) {
  const current = operator ?? defaultFilterOperator(col.type);

  return (
    <div className="grid grid-cols-1 items-center gap-2 px-3 py-2.5 sm:grid-cols-[7rem_9rem_minmax(0,1fr)]">
      <span
        className="truncate text-sm font-medium text-foreground"
        title={col.name}
      >
        {col.name}
      </span>
      <Select
        value={current}
        onValueChange={(next) =>
          onOperatorChange(col.id, next as FilterOperator)
        }
      >
        <SelectTrigger
          className="h-9 w-full text-sm"
          aria-label={`${col.name} condition`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FILTER_OPERATORS.map((op) => (
            <SelectItem key={op} value={op}>
              {FILTER_OPERATOR_LABELS[op]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {operatorNeedsValue(current) ? (
        <FilterComponent
          col={col}
          filterMeta={{ filter }}
          updateFilter={onValueChange}
        />
      ) : (
        <span className="text-sm text-muted-foreground">No value needed</span>
      )}
    </div>
  );
});
