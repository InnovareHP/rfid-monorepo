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
import type { FieldPath, UseFormReturn } from "react-hook-form";
import type { BlastFormValues } from "./blast-block-schema";
import { FONT_FAMILIES } from "./blast-block-style";
import { BlastColorField } from "./blast-color-field";
import { RichTextEditor } from "./rich-text-editor";

type BlastRichTextFieldProps = {
  form: UseFormReturn<BlastFormValues>;
  label: string;
  // The rich text value and its typography live on sibling props.
  valueName: FieldPath<BlastFormValues>;
  styleName: string;
};

// One labelled group: editor, then the Font / Font Size / Text Color trio the
// design repeats under every text surface.
export const BlastRichTextField = ({
  form,
  label,
  valueName,
  styleName,
}: BlastRichTextFieldProps) => (
  <div className="space-y-3 border-b border-border pb-4">
    <FormField
      control={form.control}
      name={valueName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <RichTextEditor
              value={typeof field.value === "string" ? field.value : ""}
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <div className="grid grid-cols-2 gap-3">
      <FormField
        control={form.control}
        name={`${styleName}.fontFamily` as FieldPath<BlastFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Font</FormLabel>
            <Select
              value={typeof field.value === "string" ? field.value : undefined}
              onValueChange={field.onChange}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Arial" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name={`${styleName}.fontSize` as FieldPath<BlastFormValues>}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Font Size</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={8}
                max={72}
                placeholder="16"
                value={typeof field.value === "number" ? field.value : ""}
                onChange={(event) =>
                  field.onChange(
                    event.target.value === ""
                      ? undefined
                      : Number(event.target.value)
                  )
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>

    <BlastColorField
      form={form}
      name={`${styleName}.color` as FieldPath<BlastFormValues>}
      label="Text Color"
      fallback="#202020"
    />
  </div>
);
