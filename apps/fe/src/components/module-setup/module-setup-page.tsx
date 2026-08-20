import { toSlug } from "@dashboard/shared";
import { PageHeader } from "@/components/page-header";
import { moduleIcon } from "@/lib/helper/module-icons";
import { createModule } from "@/services/module/module-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Form,
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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  MODULE_FIELD_TYPES,
  MODULE_ICON_CHOICES,
  MODULE_TEMPLATES,
  SELECT_FIELD_TYPES,
} from "./module-templates";

const schema = z.object({
  label: z.string().trim().min(1, "Name is required").max(40),
  labelSingular: z.string().trim().min(1, "Singular name is required").max(40),
  icon: z.string().min(1),
  fields: z
    .array(
      z.object({
        fieldName: z.string().trim().min(1, "Column name is required").max(60),
        fieldType: z.string().min(1),
        options: z.array(z.string()).optional(),
      })
    )
    .min(1, "A module needs at least one column"),
});

type ModuleFormValues = z.infer<typeof schema>;

const STEPS = ["Name it", "Columns", "Review"];

// The key lands in URLs and query keys, so it is shown before creation and
// frozen afterwards rather than being editable free text.
// Templates are readonly literals, so they are copied into mutable rows before
// the field array takes them.
const templateFields = (value: string) =>
  (MODULE_TEMPLATES.find((t) => t.value === value) ?? MODULE_TEMPLATES[2]).fields.map(
    (field) => ({
      fieldName: field.fieldName,
      fieldType: field.fieldType as string,
      options: "options" in field ? [...field.options] : [],
    })
  );

const previewKey = (label: string) =>
  toSlug(label).replace(/-/g, "_").toUpperCase();

export default function ModuleSetupPage() {
  const { team } = useParams({ strict: false }) as { team: string };
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      label: "",
      labelSingular: "",
      icon: "Table2",
      fields: templateFields("CUSTOM"),
    },
  });

  const fieldArray = useFieldArray({ control: form.control, name: "fields" });
  const label = form.watch("label");
  const icon = form.watch("icon");
  const fields = form.watch("fields");
  const Icon = moduleIcon(icon);

  const createMutation = useMutation({
    mutationFn: (values: ModuleFormValues) => createModule(values),
    onSuccess: (created) => {
      toast.success(`${created.label} created`);
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      navigate({
        to: "/$team/records/$moduleKey",
        params: { team, moduleKey: created.key },
      });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Failed to create module";
      toast.error(message);
    },
  });

  const goNext = async () => {
    const valid = await form.trigger(
      step === 0 ? ["label", "labelSingular", "icon"] : ["fields"]
    );

    if (valid && step === 1) {
      const missing = fields.find(
        (row) => SELECT_FIELD_TYPES.has(row.fieldType) && !row.options?.length
      );

      if (missing) {
        toast.error(`${missing.fieldName || "A choice column"} needs at least one choice`);
        return;
      }
    }

    if (valid) setStep(step + 1);
  };

  const applyTemplate = (value: string) =>
    fieldArray.replace(templateFields(value));

  return (
    <div className="page-style">
      <PageHeader
        title="New Module"
        description="Create a record type of your own, with its own columns and board."
      />

      <ol className="flex gap-2 text-sm">
        {STEPS.map((title, index) => (
          <li
            key={title}
            className={
              index === step
                ? "rounded-md bg-brand px-3 py-1 text-primary-foreground"
                : "rounded-md bg-muted px-3 py-1 text-muted-foreground"
            }
          >
            {index + 1}. {title}
          </li>
        ))}
      </ol>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
          className="max-w-2xl space-y-6"
        >
          {step === 0 && (
            <>
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendors" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="labelSingular"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Singular name</FormLabel>
                    <FormControl>
                      <Input placeholder="Vendor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MODULE_ICON_CHOICES.map((name) => {
                          const Choice = moduleIcon(name);

                          return (
                            <SelectItem key={name} value={name}>
                              <span className="flex items-center gap-2">
                                <Choice className="h-4 w-4" />
                                {name}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {label && (
                <p className="text-sm text-muted-foreground">
                  Address will be /records/{previewKey(label)}. This cannot be
                  changed later.
                </p>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium">Start from</p>
                <div className="flex flex-wrap gap-2">
                  {MODULE_TEMPLATES.map((template) => (
                    <Button
                      key={template.value}
                      type="button"
                      variant="outline"
                      onClick={() => applyTemplate(template.value)}
                    >
                      {template.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {fieldArray.fields.map((row, index) => (
                  <div
                    key={row.id}
                    className="space-y-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-end gap-2">
                    <FormField
                      control={form.control}
                      name={`fields.${index}.fieldName`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Column</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`fields.${index}.fieldType`}
                      render={({ field }) => (
                        <FormItem className="w-44">
                          <FormLabel>Type</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
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
                        disabled={fieldArray.fields.length === 1}
                        onClick={() => fieldArray.remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {SELECT_FIELD_TYPES.has(fields[index]?.fieldType) && (
                      <FormField
                        control={form.control}
                        name={`fields.${index}.options`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Choices</FormLabel>
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
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  fieldArray.append({ fieldName: "", fieldType: "TEXT" })
                }
              >
                <Plus className="h-4 w-4" />
                Add column
              </Button>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4 rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" />
                <span className="font-medium">{form.getValues("label")}</span>
                <span className="text-sm text-muted-foreground">
                  /records/{previewKey(label)}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-table-header">
                    <tr>
                      <th className="p-2 font-medium">
                        {form.getValues("labelSingular")} Name
                      </th>
                      {fields.map((row, index) => (
                        <th key={index} className="p-2 font-medium">
                          {row.fieldName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="text-muted-foreground">
                      <td className="p-2">Example</td>
                      {fields.map((row, index) => (
                        <td key={index} className="p-2">
                          {row.options?.length
                            ? row.options[0]
                            : MODULE_FIELD_TYPES.find(
                                (t) => t.value === row.fieldType
                              )?.label}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(step - 1)}
              >
                Back
              </Button>
            )}

            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Continue
              </Button>
            ) : (
              <Button type="submit" disabled={createMutation.isPending}>
                Create module
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
