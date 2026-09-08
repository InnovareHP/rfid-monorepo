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
import { Button } from "@dashboard/ui/components/button";
import { Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { ModuleFormValues } from "./module-setup-schema";
import { MODULE_FIELD_TYPES, SELECT_FIELD_TYPES } from "./module-templates";

type ModuleColumnRowProps = {
  form: UseFormReturn<ModuleFormValues>;
  index: number;
  fieldType: string;
  canRemove: boolean;
  onRemove: () => void;
};

export const ModuleColumnRow = ({
  form,
  index,
  fieldType,
  canRemove,
  onRemove,
}: ModuleColumnRowProps) => (
  <div className="space-y-3 rounded-lg border border-border bg-card p-3">
    <div className="flex items-start gap-2">
      <span className="mt-2.5 w-5 shrink-0 text-sm text-muted-foreground">
        {index + 1}
      </span>

      <FormField
        control={form.control}
        name={`fields.${index}.fieldName`}
        render={({ field }) => (
          <FormItem className="min-w-0 flex-1">
            <FormLabel className="sr-only">Column name</FormLabel>
            <FormControl>
              <Input placeholder="Column name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`fields.${index}.fieldType`}
        render={({ field }) => (
          <FormItem className="w-32 shrink-0 sm:w-44">
            <FormLabel className="sr-only">Type</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {MODULE_FIELD_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0"
        disabled={!canRemove}
        aria-label={`Remove column ${index + 1}`}
        onClick={onRemove}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>

    {SELECT_FIELD_TYPES.has(fieldType) && (
      <FormField
        control={form.control}
        name={`fields.${index}.options`}
        render={({ field }) => (
          <FormItem className="pl-7">
            <FormLabel className="text-xs text-muted-foreground">
              Choices, separated by commas
            </FormLabel>
            <FormControl>
              <Input
                placeholder="New, Active, Inactive"
                value={(field.value ?? []).join(", ")}
                onChange={(event) =>
                  field.onChange(
                    event.target.value
                      .split(",")
                      .map((choice) => choice.trim())
                      .filter(Boolean)
                  )
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )}
  </div>
);
