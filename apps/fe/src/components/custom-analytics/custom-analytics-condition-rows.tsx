import type { ModuleColumn } from "@/services/board/board-module-service";
import { Button } from "@dashboard/ui/components/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Plus, X } from "lucide-react";
import { useFieldArray, type Control } from "react-hook-form";
import {
  VALUELESS_OPERATORS,
  type BuilderValues,
} from "./custom-analytics-builder-schema";

const OPERATORS = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Does not equal" },
  { value: "contains", label: "Contains" },
  { value: "in", label: "Is any of" },
  { value: "gt", label: "Greater than" },
  { value: "lt", label: "Less than" },
  { value: "isEmpty", label: "Is empty" },
  { value: "isNotEmpty", label: "Is not empty" },
];

const MATCHES = [
  { value: "AND", label: "Match all" },
  { value: "OR", label: "Match any" },
];

// name is a field-array path so the same rows render the chart's own filter and
// a PERCENT chart's numerator without a second copy of this component.
type CustomAnalyticsConditionRowsProps = {
  control: Control<BuilderValues>;
  columns: ModuleColumn[];
  conditions: BuilderValues["conditions"];
  name: "conditions" | "numeratorConditions";
  matchName: "filterMatch" | "numeratorMatch";
  label: string;
};

export function CustomAnalyticsConditionRows({
  control,
  columns,
  conditions,
  name,
  matchName,
  label,
}: CustomAnalyticsConditionRowsProps) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <FormLabel>{label}</FormLabel>

        {fields.length > 1 && (
          <FormField
            control={control}
            name={matchName}
            render={({ field }) => (
              <FormItem>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {MATCHES.map((match) => (
                      <SelectItem key={match.value} value={match.value}>
                        {match.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        )}
      </div>

      {fields.map((row, index) => (
        <div key={row.id} className="flex items-start gap-2">
          <FormField
            control={control}
            name={`${name}.${index}.fieldId`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Field" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {columns.map((column) => (
                      <SelectItem key={column.id} value={column.id}>
                        {column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name={`${name}.${index}.operator`}
            render={({ field }) => (
              <FormItem className="w-40">
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {OPERATORS.map((operator) => (
                      <SelectItem key={operator.value} value={operator.value}>
                        {operator.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {!VALUELESS_OPERATORS.includes(conditions[index]?.operator) && (
            <FormField
              control={control}
              name={`${name}.${index}.value`}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      placeholder={
                        conditions[index]?.operator === "in"
                          ? "Won, Lost"
                          : "Won"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            aria-label="Remove condition"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        onClick={() => append({ fieldId: "", operator: "eq", value: "" })}
      >
        <Plus className="h-4 w-4" />
        Add condition
      </Button>
    </div>
  );
}
