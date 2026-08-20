import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import type { FieldPath, UseFormReturn } from "react-hook-form";
import type { BlastFormValues } from "./blast-block-schema";

type BlastColorFieldProps = {
  form: UseFormReturn<BlastFormValues>;
  name: FieldPath<BlastFormValues>;
  label: string;
  fallback: string;
};

// Swatch plus hex input, the pairing every color row in the builder uses.
export const BlastColorField = ({
  form,
  name,
  label,
  fallback,
}: BlastColorFieldProps) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => {
      const value = typeof field.value === "string" ? field.value : "";

      return (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="flex gap-2">
            <input
              type="color"
              aria-label={label}
              value={value || fallback}
              onChange={(event) => field.onChange(event.target.value)}
              className="size-9 shrink-0 cursor-pointer rounded-md border border-border bg-background"
            />
            <FormControl>
              <Input
                placeholder={fallback}
                value={value}
                onChange={(event) => field.onChange(event.target.value)}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      );
    }}
  />
);
