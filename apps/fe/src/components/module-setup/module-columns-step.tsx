import { Button } from "@dashboard/ui/components/button";
import { FormField, FormItem, FormMessage } from "@dashboard/ui/components/form";
import { cn } from "@dashboard/ui/lib/utils";
import { Plus } from "lucide-react";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
import { ModuleColumnRow } from "./module-column-row";
import type { ModuleColumn, ModuleFormValues } from "./module-setup-schema";
import { MODULE_TEMPLATES } from "./module-templates";

type ModuleColumnsStepProps = {
  form: UseFormReturn<ModuleFormValues>;
  fieldArray: UseFieldArrayReturn<ModuleFormValues, "fields">;
  columns: ModuleColumn[];
  template: string | null;
  onTemplateChange: (value: string) => void;
  labelSingular: string;
};

export const ModuleColumnsStep = ({
  form,
  fieldArray,
  columns,
  template,
  onTemplateChange,
  labelSingular,
}: ModuleColumnsStepProps) => (
  <div className="space-y-6">
    <div className="space-y-2">
      <p className="text-sm font-medium">Start from</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {MODULE_TEMPLATES.map((option) => {
          const selected = template === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onTemplateChange(option.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                selected
                  ? "border-brand bg-brand/5"
                  : "border-border bg-card hover:border-brand/40"
              )}
            >
              <span
                className={cn(
                  "block text-sm font-medium",
                  selected ? "text-brand" : "text-foreground"
                )}
              >
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Picking a template replaces the columns below.
      </p>
    </div>

    <div className="space-y-2">
      <p className="text-sm font-medium">Columns</p>

      <div className="rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {labelSingular || "Record"} Name
          </span>{" "}
          is always the first column and cannot be removed.
        </p>
      </div>

      <div className="space-y-2">
        {fieldArray.fields.map((row, index) => (
          <ModuleColumnRow
            key={row.id}
            form={form}
            index={index}
            fieldType={columns[index]?.fieldType ?? "TEXT"}
            canRemove={fieldArray.fields.length > 1}
            onRemove={() => fieldArray.remove(index)}
          />
        ))}
      </div>

      {/* The array-level message (at least one column) has no row to sit on. */}
      <FormField
        control={form.control}
        name="fields"
        render={() => (
          <FormItem>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <Button
      type="button"
      variant="outline"
      onClick={() =>
        fieldArray.append({ fieldName: "", fieldType: "TEXT", options: [] })
      }
    >
      <Plus className="size-4" />
      Add column
    </Button>
  </div>
);
