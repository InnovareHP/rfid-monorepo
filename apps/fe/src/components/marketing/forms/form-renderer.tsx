import { OptionalTag, RequiredLegend, RequiredMark } from "@/components/field-marks";
import LocationCell from "@/components/reusable-table/location-cell";
import type {
  PublicForm,
  PublicFormField,
} from "@/services/marketing/form-service";
import { publicFormPlacesEndpoints } from "@/services/marketing/form-service";
import { Button } from "@dashboard/ui/components/button";
import { Checkbox } from "@dashboard/ui/components/checkbox";
import { DatePicker } from "@dashboard/ui/components/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@dashboard/ui/components/form";
import { Input } from "@dashboard/ui/components/input";
import { MultiSelect } from "@dashboard/ui/components/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheckBig, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const INPUT_TYPE_BY_FIELD_TYPE: Record<string, string> = {
  EMAIL: "email",
  PHONE: "tel",
  NUMBER: "number",
};

const CHECK_BY_FIELD_TYPE: Record<string, { pattern: RegExp; message: string }> = {
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Enter a valid email address",
  },
  PHONE: {
    pattern: /^[\d\s()+.-]{7,20}$/,
    message: "Enter a valid phone number",
  },
  NUMBER: {
    pattern: /^-?\d+(\.\d+)?$/,
    message: "Enter a number",
  },
};

const isEmptyValue = (mapping: PublicFormField, value: string) =>
  mapping.fieldType === "CHECKBOX" ? value !== "true" : value.trim() === "";

const buildSchema = (mappings: PublicFormField[]) =>
  z.object(
    Object.fromEntries(
      mappings.map((mapping) => [
        mapping.fieldId,
        z.string().superRefine((value, ctx) => {
          if (isEmptyValue(mapping, value)) {
            if (mapping.required) {
              ctx.addIssue({
                code: "custom",
                message: `${mapping.label} is required`,
              });
            }
            return;
          }

          const check = CHECK_BY_FIELD_TYPE[mapping.fieldType];
          if (check && !check.pattern.test(value)) {
            ctx.addIssue({ code: "custom", message: check.message });
          }
        }),
      ])
    )
  );

type FieldControlProps = {
  mapping: PublicFormField;
  value: string;
  onChange: (value: string) => void;
  slug: string;
  disabled: boolean;
};

// Every option-backed type gets a picker so nothing has to be typed by hand.
const FieldControl = ({
  mapping,
  value,
  onChange,
  slug,
  disabled,
}: FieldControlProps) => {
  if (mapping.fieldType === "DATE") {
    return <DatePicker value={value} onChange={onChange} disabled={disabled} />;
  }

  if (mapping.fieldType === "LOCATION") {
    const endpoints = publicFormPlacesEndpoints(slug);

    return (
      <LocationCell
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder="Start typing an address"
        className="h-9 w-full rounded-md border-input bg-transparent text-sm shadow-xs"
        {...endpoints}
      />
    );
  }

  if (mapping.fieldType === "MULTISELECT") {
    return (
      <MultiSelect
        options={mapping.options.map((option) => ({
          label: option,
          value: option,
        }))}
        defaultValue={value ? value.split(",") : []}
        onValueChange={(next) => onChange(next.join(","))}
        placeholder="Select options"
        disabled={disabled || mapping.options.length === 0}
        className="w-full"
      />
    );
  }

  if (mapping.fieldType === "DROPDOWN" || mapping.fieldType === "STATUS") {
    return (
      <Select
        value={value}
        onValueChange={onChange}
        disabled={disabled || mapping.options.length === 0}
      >
        <SelectTrigger className="w-full">
          <SelectValue
            placeholder={
              mapping.options.length === 0 ? "No options" : "Select an option"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {mapping.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      type={INPUT_TYPE_BY_FIELD_TYPE[mapping.fieldType] ?? "text"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  );
};

type FormRendererProps = {
  form: PublicForm;
  slug: string;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  submitted: boolean;
  preview?: boolean;
};

// Presentational form body shared between the standalone public form page,
// a FORM_EMBED section on a landing page, and the builder preview canvas.
export const FormRenderer = ({
  form,
  slug,
  onSubmit,
  submitted,
  preview = false,
}: FormRendererProps) => {
  const rhForm = useForm<Record<string, string>>({
    resolver: zodResolver(buildSchema(form.fieldMappings)),
    values: Object.fromEntries(form.fieldMappings.map((m) => [m.fieldId, ""])),
  });

  const hasRequired = form.fieldMappings.some((mapping) => mapping.required);

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CircleCheckBig className="size-10 text-[#005cb1]" />
        <h1 className="text-xl font-semibold text-[#0d3185]">Thank you</h1>
        <p className="text-sm text-muted-foreground">
          Your submission has been received.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold text-[#0d3185] sm:text-3xl">
          {form.name}
        </h1>
        {hasRequired && (
          <RequiredLegend className="text-sm text-muted-foreground" />
        )}
      </div>

      <Form {...rhForm}>
        <form onSubmit={rhForm.handleSubmit(onSubmit)} className="space-y-6">
          <fieldset disabled={preview} className="space-y-5">
            {form.fieldMappings.map((mapping) => (
              <FormField
                key={mapping.fieldId}
                control={rhForm.control}
                name={mapping.fieldId}
                render={({ field }) =>
                  mapping.fieldType === "CHECKBOX" ? (
                    <FormItem className="flex items-center gap-2.5 rounded-md border border-input px-3 py-2.5">
                      <FormControl>
                        <Checkbox
                          checked={field.value === "true"}
                          disabled={preview}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? "true" : "false")
                          }
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal">
                        {mapping.label}
                        {mapping.required && <RequiredMark />}
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  ) : (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="flex items-center gap-1.5">
                        {mapping.label}
                        {mapping.required ? <RequiredMark /> : <OptionalTag />}
                      </FormLabel>
                      <FormControl>
                        <FieldControl
                          mapping={mapping}
                          value={field.value}
                          onChange={field.onChange}
                          slug={slug}
                          disabled={preview}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }
              />
            ))}
          </fieldset>

          <div className="flex justify-center">
            <Button
              type="submit"
              size="lg"
              className="w-full bg-[#0d3185] px-8 text-white hover:bg-[#0d3185]/90 sm:w-auto"
              disabled={preview || rhForm.formState.isSubmitting}
            >
              {rhForm.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {form.submitButtonText}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
