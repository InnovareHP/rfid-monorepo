import { FilterComponent } from "@/components/master-list/filter-component";
import {
  defaultFilterOperator,
  FILTER_OPERATOR_LABELS,
  FILTER_OPERATORS,
  operatorNeedsValue,
  type FilterOperator,
} from "@dashboard/shared";
import { Label } from "@dashboard/ui/components/label";
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
    <div className="space-y-2">
      <Label>{col.name}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select
          value={current}
          onValueChange={(next) =>
            onOperatorChange(col.id, next as FilterOperator)
          }
        >
          <SelectTrigger
            className="w-full sm:w-44"
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
        {operatorNeedsValue(current) && (
          <div className="min-w-0 flex-1">
            <FilterComponent
              col={col}
              filterMeta={{ filter }}
              updateFilter={onValueChange}
            />
          </div>
        )}
      </div>
    </div>
  );
});
