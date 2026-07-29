import type { PublicForm } from "@/services/marketing/form-service";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { Input } from "@dashboard/ui/components/input";
import { Label } from "@dashboard/ui/components/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const INPUT_TYPE_BY_FIELD_TYPE: Record<string, string> = {
  EMAIL: "email",
  PHONE: "tel",
  NUMBER: "number",
  DATE: "date",
};

type FormRendererProps = {
  form: PublicForm;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  submitted: boolean;
};

// Presentational form body shared between the standalone public form page
// and a FORM_EMBED section on a landing page — same markup, same states.
export const FormRenderer = ({ form, onSubmit, submitted }: FormRendererProps) => {
  const schema = z.object(
    Object.fromEntries(
      form.fieldMappings.map((mapping) => [
        mapping.fieldId,
        mapping.required
          ? z.string().min(1, `${mapping.label} is required`)
          : z.string().optional(),
      ])
    )
  );

  const rhForm = useForm<Record<string, string>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    values: Object.fromEntries(form.fieldMappings.map((m) => [m.fieldId, ""])),
  });

  if (submitted) {
    return (
      <div className="text-center space-y-2">
        <h1 className="text-lg font-semibold text-gray-900">Thank you</h1>
        <p className="text-sm text-gray-500">
          Your submission has been received.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-gray-900">{form.name}</h1>
      <form onSubmit={rhForm.handleSubmit(onSubmit)} className="space-y-4">
        {form.fieldMappings.map((mapping) =>
          mapping.fieldType === "CHECKBOX" ? (
            <label
              key={mapping.fieldId}
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                onCheckedChange={(checked) =>
                  rhForm.setValue(mapping.fieldId, checked ? "true" : "false")
                }
              />
              {mapping.label}
              {mapping.required && <span className="text-red-500">*</span>}
            </label>
          ) : (
            <div key={mapping.fieldId} className="space-y-1.5">
              <Label htmlFor={mapping.fieldId}>
                {mapping.label}
                {mapping.required && (
                  <span className="text-red-500 ml-0.5">*</span>
                )}
              </Label>
              <Input
                id={mapping.fieldId}
                type={INPUT_TYPE_BY_FIELD_TYPE[mapping.fieldType] ?? "text"}
                {...rhForm.register(mapping.fieldId)}
              />
              {rhForm.formState.errors[mapping.fieldId] && (
                <p className="text-xs text-destructive">
                  {String(rhForm.formState.errors[mapping.fieldId]?.message)}
                </p>
              )}
            </div>
          )
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={rhForm.formState.isSubmitting}
        >
          {rhForm.formState.isSubmitting && (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          )}
          {form.submitButtonText}
        </Button>
      </form>
    </div>
  );
};
