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
import { BlastColorField } from "./blast-color-field";
import { BlastUploadButton } from "./blast-upload-button";

type BlastSurfaceFieldsProps = {
  form: UseFormReturn<BlastFormValues>;
  index: number;
};

// Background color and image, which every block type exposes.
export const BlastSurfaceFields = ({
  form,
  index,
}: BlastSurfaceFieldsProps) => {
  const imageName =
    `blocks.${index}.props.backgroundImage` as FieldPath<BlastFormValues>;

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <BlastColorField
        form={form}
        name={
          `blocks.${index}.props.backgroundColor` as FieldPath<BlastFormValues>
        }
        label="Background Color"
        fallback="#f4f9ff"
      />

      <FormField
        control={form.control}
        name={imageName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Background Image</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Input
                  placeholder="https://"
                  value={typeof field.value === "string" ? field.value : ""}
                  onChange={field.onChange}
                />
              </FormControl>
              <BlastUploadButton
                onUploaded={(url) =>
                  form.setValue(imageName, url, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
