import LocationCell from "@/components/reusable-table/location-cell";
import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Checkbox } from "@dashboard/ui/components/checkbox";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useFieldArray, useForm, type UseFormReturn } from "react-hook-form";
import { z } from "zod";

export interface RecordColumn {
  id: string;
  name: string;
  type: string;
}

export interface CreatedRecord {
  recordName: string;
  values: Record<string, string>;
}

interface RecordCreatePageProps {
  title: string;
  description: string;
  entityLabel: string;
  nameLabel: string;
  columns: RecordColumn[];
  isLoadingColumns: boolean;
  isSubmitting: boolean;
  fetchDropdownOptions: (fieldId: string) => Promise<any>;
  onSubmit: (records: CreatedRecord[]) => void;
  onBack: () => void;
}

type FormValues = { records: Record<string, any>[] };

const RecordCreatePage = ({
  title,
  description,
  entityLabel,
  nameLabel,
  columns,
  isLoadingColumns,
  isSubmitting,
  fetchDropdownOptions,
  onSubmit,
  onBack,
}: RecordCreatePageProps) => {
  if (isLoadingColumns) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RecordCreateForm
      title={title}
      description={description}
      entityLabel={entityLabel}
      nameLabel={nameLabel}
      columns={columns}
      isSubmitting={isSubmitting}
      fetchDropdownOptions={fetchDropdownOptions}
      onSubmit={onSubmit}
      onBack={onBack}
    />
  );
};

const RecordCreateForm = ({
  title,
  description,
  entityLabel,
  nameLabel,
  columns,
  isSubmitting,
  fetchDropdownOptions,
  onSubmit,
  onBack,
}: Omit<RecordCreatePageProps, "isLoadingColumns">) => {
  const formSchema = useMemo(() => {
    const fieldSchemas: Record<string, z.ZodTypeAny> = {
      record_name: z.string().min(1, `${nameLabel} is required`),
    };
    columns.forEach((col) => {
      fieldSchemas[col.id] =
        col.type === "CHECKBOX" ? z.boolean().optional() : z.string().optional();
    });
    return z.object({
      records: z
        .array(z.object(fieldSchemas))
        .min(1, `At least one ${entityLabel.toLowerCase()} is required`),
    });
  }, [columns, nameLabel, entityLabel]);

  const emptyRecord = useMemo(
    () => ({
      record_name: "",
      ...columns.reduce((acc: Record<string, any>, col) => {
        acc[col.id] = col.type === "CHECKBOX" ? false : "";
        return acc;
      }, {}),
    }),
    [columns]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { records: [emptyRecord] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "records",
  });

  const handleSubmit = (values: FormValues) => {
    const records: CreatedRecord[] = values.records.map((record) => {
      const fieldValues: Record<string, string> = {};
      columns.forEach((col) => {
        const value = record[col.id];
        fieldValues[col.id] =
          col.type === "CHECKBOX" ? (value ? "true" : "false") : value || "";
      });
      return { recordName: record.record_name, values: fieldValues };
    });
    onSubmit(records);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="border-gray-300 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {title}
            </h1>
            <p className="text-gray-500 mt-1">{description}</p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {fields.map((field, index) => (
              <Card key={field.id} className="border shadow-sm">
                <CardHeader className="bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      {entityLabel} #{index + 1}
                    </CardTitle>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <FormField
                    control={form.control}
                    name={`records.${index}.record_name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-semibold text-gray-700">
                          {nameLabel} <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value as string}
                            placeholder={`Enter ${nameLabel.toLowerCase()}`}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {columns
                      .filter((column) => column.type !== "CHECKBOX")
                      .map((column) => (
                        <RecordField
                          key={column.id}
                          column={column}
                          index={index}
                          form={form}
                          fetchDropdownOptions={fetchDropdownOptions}
                        />
                      ))}
                  </div>

                  {columns.some((column) => column.type === "CHECKBOX") && (
                    <div className="space-y-3">
                      {columns
                        .filter((column) => column.type === "CHECKBOX")
                        .map((column) => (
                          <RecordField
                            key={column.id}
                            column={column}
                            index={index}
                            form={form}
                            fetchDropdownOptions={fetchDropdownOptions}
                          />
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            <div className="flex items-center justify-between gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => append(emptyRecord)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another {entityLabel}
              </Button>

              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={onBack}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    `Create ${entityLabel}s`
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

const RecordField = ({
  column,
  index,
  form,
  fetchDropdownOptions,
}: {
  column: RecordColumn;
  index: number;
  form: UseFormReturn<FormValues>;
  fetchDropdownOptions: (fieldId: string) => Promise<any>;
}) => {
  const fieldName = `records.${index}.${column.id}` as const;

  const { data: dropdownOptions } = useQuery({
    queryKey: ["record-dropdown-options", column.id],
    queryFn: () => fetchDropdownOptions(column.id),
    enabled: column.type === "DROPDOWN" || column.type === "ASSIGNED_TO",
  });

  switch (column.type) {
    case "DATE":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                {column.name}
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                      {field.value ? (
                        format(new Date(field.value), "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value ? new Date(field.value) : undefined}
                    onSelect={(date) => {
                      field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "DROPDOWN":
    case "ASSIGNED_TO":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem className="w-full">
              <FormLabel className="text-sm font-semibold text-gray-700">
                {column.name}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={`Select ${column.name.toLowerCase()}`}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="w-full">
                  {dropdownOptions?.map((option: any) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "CHECKBOX":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-sm font-semibold text-gray-700 cursor-pointer leading-none">
                {column.name}
              </FormLabel>
            </FormItem>
          )}
        />
      );

    case "LOCATION":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                {column.name}
              </FormLabel>
              <FormControl>
                <LocationCell value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    default:
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                {column.name}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={`Enter ${column.name.toLowerCase()}`}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
  }
};

export default RecordCreatePage;
