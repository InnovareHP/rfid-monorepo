import { FormFieldsSkeleton } from "@/components/skeletons/page-skeletons";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import LocationCell, {
  type AddressComponents,
} from "@/components/reusable-table/location-cell";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/reusable-table/searchable-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toFieldOptions } from "@/lib/helper/field-options";
import { moduleOptionHref } from "@/lib/helper/module-route";
import { placeholderFor } from "@/lib/helper/field-placeholder";
import { getLinkCandidates } from "@/services/board/board-module-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import { Card, CardContent } from "@dashboard/ui/components/card";
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
import { Textarea } from "@dashboard/ui/components/textarea";
import { cn } from "@dashboard/ui/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarIcon,
  ChevronRight,
  Loader2,
  Plus,
} from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { LinkTargetEmpty } from "./link-target-empty";
import { OptionFieldActions } from "./option-field-actions";
import { useMemo, useState } from "react";
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

// Sentinel so a section can position the record name alongside dynamic fields
export const RECORD_NAME_FIELD = "__record_name__";

export type RecordFieldSpan = "full" | "half" | "third";

export type RecordFieldLayout = {
  name: string;
  span?: RecordFieldSpan;
  required?: boolean;
  multiline?: boolean;
  helperText?: string;
  // Column names to populate when an address is picked
  autoFill?: Partial<Record<keyof AddressComponents, string>>;
};

export type RecordFormSection = {
  title: string;
  fields: RecordFieldLayout[];
};

interface RecordCreatePageProps {
  title: string;
  description: string;
  entityLabel: string;
  entityLabelPlural: string;
  nameLabel: string;
  columns: RecordColumn[];
  isLoadingColumns: boolean;
  isSubmitting: boolean;
  fetchDropdownOptions: (
    fieldId: string,
    search: string,
    limit: number
  ) => Promise<any>;
  onSubmit: (records: CreatedRecord[]) => void;
  onBack: () => void;
  sections?: RecordFormSection[];
  // Module key the record belongs to, so option pickers can reach that module's
  // option-configuration screen
  optionModule?: string;
}

type FormValues = { records: Record<string, any>[] };

// Thirds collapse to halves at md so three inputs never share a tablet row
const SPAN_CLASS: Record<RecordFieldSpan, string> = {
  full: "md:col-span-6",
  half: "md:col-span-3",
  third: "md:col-span-3 lg:col-span-2",
};

const RecordCreatePage = ({
  title,
  description,
  entityLabel,
  entityLabelPlural,
  nameLabel,
  columns,
  isLoadingColumns,
  isSubmitting,
  fetchDropdownOptions,
  onSubmit,
  onBack,
  sections,
  optionModule,
}: RecordCreatePageProps) => {
  if (isLoadingColumns) {
    return (
      <div className="page-style">
        <div className="flex items-start gap-3 sm:gap-4">
          <Skeleton className="size-9 shrink-0" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-8 w-56 sm:h-9 sm:w-72" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </div>
        <Card>
          <CardContent className="space-y-6 p-6">
            <FormFieldsSkeleton fields={8} />
            <Skeleton className="h-10 w-40" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <RecordCreateForm
      title={title}
      description={description}
      entityLabel={entityLabel}
      entityLabelPlural={entityLabelPlural}
      nameLabel={nameLabel}
      columns={columns}
      isSubmitting={isSubmitting}
      fetchDropdownOptions={fetchDropdownOptions}
      onSubmit={onSubmit}
      onBack={onBack}
      sections={sections}
      optionModule={optionModule}
    />
  );
};

// One control height for every field type so inputs, selects, and pickers line up
const FIELD_CONTROL_CLASS = "mt-auto h-11 w-full";
const FIELD_ITEM_CLASS = "flex h-full flex-col";

// Autocomplete carries the long lists, so a picker only needs a first page
const PICKER_LIMIT = 10;
const LABEL_CLASS = "flex-wrap gap-x-2 text-sm font-semibold text-gray-700";

function isOptionBacked(columnType: string) {
  return columnType === "DROPDOWN" || columnType === "STATUS";
}

// Appends any column the caller's sections do not mention, required like the rest
function resolveSections(
  sections: RecordFormSection[],
  columns: RecordColumn[]
): RecordFormSection[] {
  const placed = new Set(
    sections.flatMap((section) => section.fields.map((field) => field.name))
  );
  const leftovers = columns
    .filter((column) => !placed.has(column.name))
    .map((column) => ({
      name: column.name,
      span: "half" as RecordFieldSpan,
      required: true,
    }));

  if (leftovers.length === 0) return sections;

  return sections.map((section, index) =>
    index === sections.length - 1
      ? { ...section, fields: [...section.fields, ...leftovers] }
      : section
  );
}

const RecordCreateForm = ({
  title,
  description,
  entityLabel,
  entityLabelPlural,
  nameLabel,
  columns,
  isSubmitting,
  fetchDropdownOptions,
  onSubmit,
  onBack,
  sections,
  optionModule,
}: Omit<RecordCreatePageProps, "isLoadingColumns">) => {
  const resolvedSections = useMemo(
    () => (sections ? resolveSections(sections, columns) : undefined),
    [sections, columns]
  );

  const layoutByName = useMemo(() => {
    const map = new Map<string, RecordFieldLayout>();
    resolvedSections?.forEach((section) =>
      section.fields.forEach((field) => map.set(field.name, field))
    );
    return map;
  }, [resolvedSections]);

  const columnsByName = useMemo(
    () => new Map(columns.map((column) => [column.name, column])),
    [columns]
  );

  const formSchema = useMemo(() => {
    const fieldSchemas: Record<string, z.ZodTypeAny> = {
      record_name: z.string().min(1, `${nameLabel} is required`),
    };
    columns.forEach((col) => {
      if (col.type === "CHECKBOX") {
        fieldSchemas[col.id] = z.boolean().optional();
        return;
      }
      fieldSchemas[col.id] = layoutByName.get(col.name)?.required
        ? z.string().min(1, `${col.name} is required`)
        : z.string().optional();
    });
    return z.object({
      records: z
        .array(z.object(fieldSchemas))
        .min(1, `At least one ${entityLabel.toLowerCase()} is required`),
    });
  }, [columns, nameLabel, entityLabel, layoutByName]);

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

  const [expandedIndex, setExpandedIndex] = useState(0);

  const handleAppend = () => {
    append(emptyRecord);
    setExpandedIndex(fields.length);
  };

  const handleRemove = (index: number) => {
    remove(index);
    setExpandedIndex((current) =>
      current >= index ? Math.max(current - 1, 0) : current
    );
  };

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

  const renderNameField = (index: number, layout?: RecordFieldLayout) => (
    <FormField
      control={form.control}
      name={`records.${index}.record_name`}
      render={({ field }) => (
        <FormItem className={FIELD_ITEM_CLASS}>
          <FormLabel className={LABEL_CLASS}>
            {nameLabel} <span className="text-red-500">*</span>
          </FormLabel>
          {layout?.helperText && (
            <p className="text-xs text-muted-foreground">{layout.helperText}</p>
          )}
          <FormControl>
            <Input
              {...field}
              value={field.value as string}
              placeholder={placeholderFor(nameLabel, "TEXT")}
              className={FIELD_CONTROL_CLASS}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const renderColumnField = (
    column: RecordColumn,
    index: number,
    layout?: RecordFieldLayout
  ) => (
    <RecordField
      column={column}
      index={index}
      form={form}
      layout={layout}
      columnsByName={columnsByName}
      fetchDropdownOptions={fetchDropdownOptions}
      optionModule={optionModule}
    />
  );

  return (
    <div className="page-style">
      <div className="w-full space-y-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="shrink-0 border-gray-300 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight page-title">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              {description}
            </p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {fields.map((field, index) => {
              const isExpanded = index === expandedIndex;
              const recordName = form.watch(`records.${index}.record_name`);

              return (
                <Card
                  key={field.id}
                  className="border shadow-sm gap-0 overflow-hidden py-0"
                >
                  <div className="flex items-center justify-between gap-2 bg-blue-50 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                      <h2 className="text-base sm:text-lg font-semibold text-brand whitespace-nowrap">
                        {entityLabel} No. {index + 1}
                      </h2>
                      {!isExpanded && recordName ? (
                        <Badge
                          variant="outline"
                          className="bg-white font-normal truncate max-w-[10rem] sm:max-w-xs"
                        >
                          {recordName}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        >
                          Remove
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
                        onClick={() =>
                          setExpandedIndex(isExpanded ? -1 : index)
                        }
                        className="hover:bg-blue-100"
                      >
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-90"
                          )}
                        />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <CardContent className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                      {resolvedSections ? (
                        resolvedSections.map((section) => (
                          <section key={section.title} className="space-y-4">
                            <h3 className="border-b pb-2 text-base font-semibold text-gray-900">
                              {section.title}
                            </h3>
                            <div className="grid grid-cols-1 items-stretch gap-x-6 gap-y-4 md:grid-cols-6">
                              {section.fields.map((layout) => {
                                const spanClass =
                                  SPAN_CLASS[layout.span ?? "half"];

                                if (layout.name === RECORD_NAME_FIELD) {
                                  return (
                                    <div
                                      key={layout.name}
                                      className={spanClass}
                                    >
                                      {renderNameField(index, layout)}
                                    </div>
                                  );
                                }

                                const column = columnsByName.get(layout.name);
                                if (!column) return null;

                                return (
                                  <div key={column.id} className={spanClass}>
                                    {renderColumnField(column, index, layout)}
                                  </div>
                                );
                              })}
                            </div>
                          </section>
                        ))
                      ) : (
                        <>
                          {renderNameField(index)}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {columns
                              .filter((column) => column.type !== "CHECKBOX")
                              .map((column) => (
                                <div key={column.id}>
                                  {renderColumnField(column, index)}
                                </div>
                              ))}
                          </div>

                          {columns.some(
                            (column) => column.type === "CHECKBOX"
                          ) && (
                            <div className="space-y-3">
                              {columns
                                .filter((column) => column.type === "CHECKBOX")
                                .map((column) => (
                                  <div key={column.id}>
                                    {renderColumnField(column, index)}
                                  </div>
                                ))}
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}

            <Button
              type="button"
              variant="outline"
              onClick={handleAppend}
              className="w-full border-dashed bg-white text-brand hover:text-brand"
            >
              <Plus className="h-4 w-4" />
              Add Another {entityLabel}
            </Button>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto sm:min-w-[120px] bg-brand text-white hover:bg-brand/90"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </div>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create {entityLabelPlural}
                  </>
                )}
              </Button>
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
  layout,
  columnsByName,
  fetchDropdownOptions,
  optionModule,
}: {
  column: RecordColumn;
  index: number;
  form: UseFormReturn<FormValues>;
  layout?: RecordFieldLayout;
  columnsByName: Map<string, RecordColumn>;
  fetchDropdownOptions: (
    fieldId: string,
    search: string,
    limit: number
  ) => Promise<any>;
  optionModule?: string;
}) => {
  const fieldName = `records.${index}.${column.id}` as const;
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const { team } = useParams({ strict: false });

  const optionsHref =
    optionModule && team
      ? moduleOptionHref(optionModule, team, column.id)
      : null;

  const { data: dropdownOptions, isFetching: isFetchingOptions } = useQuery({
    queryKey: ["record-dropdown-options", column.id, debouncedSearch],
    queryFn: () =>
      fetchDropdownOptions(column.id, debouncedSearch, PICKER_LIMIT),
    enabled: isOptionBacked(column.type) || column.type === "ASSIGNED_TO",
    placeholderData: keepPreviousData,
  });

  const linkTargetModule =
    column.type === "CONTACT_LINK"
      ? "CONTACT"
      : column.type === "COMPANY_LINK"
        ? "COMPANY"
        : column.type === "REFERRAL_LINK"
          ? "LEAD"
          : null;

  const { data: linkRecords, isFetching: isFetchingLinks } = useQuery({
    queryKey: ["link-records", linkTargetModule, debouncedSearch],
    queryFn: () =>
      getLinkCandidates(
        linkTargetModule as string,
        1,
        PICKER_LIMIT,
        debouncedSearch
      ),
    enabled: !!linkTargetModule,
    placeholderData: keepPreviousData,
  });

  const optionChoices: SearchableOption[] = toFieldOptions(dropdownOptions).map(
    (option) => ({
      id: option.id,
      label: option.value,
      value: option.value,
    })
  );

  const linkChoices: SearchableOption[] = (linkRecords ?? []).map(
    (record: { id: string; value: string }) => ({
      id: record.id,
      label: record.value,
      value: record.id,
    })
  );

  const hasNoOptions =
    isOptionBacked(column.type) &&
    !!dropdownOptions &&
    optionChoices.length === 0 &&
    !debouncedSearch;

  const optionsWarning =
    hasNoOptions && layout?.required ? (
      <span className="text-xs font-normal text-warning">
        No options yet -{" "}
        {optionsHref ? (
          <a
            href={optionsHref}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline underline-offset-2"
          >
            add them in settings
          </a>
        ) : (
          "add them in settings"
        )}
      </span>
    ) : null;

  const label = (
    <FormLabel className={LABEL_CLASS}>
      {column.name}
      {layout?.required && column.type !== "CHECKBOX" && (
        <span className="text-red-500"> *</span>
      )}
      {optionsWarning}
    </FormLabel>
  );

  const helperText = layout?.helperText ? (
    <p className="text-xs text-muted-foreground">{layout.helperText}</p>
  ) : null;

  // A required select with nothing to pick would block submission with no explanation

  // Address selection fills the sibling columns the caller mapped
  const applyAddressComponents = (components: AddressComponents) => {
    if (!layout?.autoFill) return;

    (
      Object.entries(layout.autoFill) as [keyof AddressComponents, string][]
    ).forEach(([componentKey, columnName]) => {
      const target = columnsByName.get(columnName);
      const value = components[componentKey];
      if (!target || !value) return;

      // A geocoded county the organization has no option for is still the right
      // answer, so it fills as picked rather than being dropped.
      form.setValue(`records.${index}.${target.id}`, value, {
        shouldValidate: true,
      });
    });
  };

  switch (column.type) {
    case "CONTACT_LINK":
    case "COMPANY_LINK":
    case "REFERRAL_LINK":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem className={cn(FIELD_ITEM_CLASS, "w-full")}>
              {label}
              {helperText}
              <FormControl>
                <SearchableSelect
                  options={linkChoices}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  search={search}
                  onSearchChange={setSearch}
                  isLoading={isFetchingLinks}
                  placeholder={`Select ${column.name.toLowerCase()}`}
                  searchPlaceholder={`Search ${column.name.toLowerCase()}...`}
                  emptyText={
                    <LinkTargetEmpty
                      targetModule={linkTargetModule ?? ""}
                      team={team as string}
                      search={search}
                      fieldLabel={column.name}
                    />
                  }
                  className={FIELD_CONTROL_CLASS}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );

    case "DATE":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem className={FIELD_ITEM_CLASS}>
              {label}
              {helperText}
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        FIELD_CONTROL_CLASS,
                        "justify-start text-left font-normal",
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
    case "STATUS":
    case "ASSIGNED_TO":
      return (
        <FormField
          control={form.control}
          name={fieldName}
          render={({ field }) => (
            <FormItem className={cn(FIELD_ITEM_CLASS, "w-full")}>
              {label}
              {helperText}
              <FormControl>
                <SearchableSelect
                  options={optionChoices}
                  value={field.value ?? ""}
                  valueLabel={field.value ?? ""}
                  onChange={field.onChange}
                  search={search}
                  onSearchChange={setSearch}
                  isLoading={isFetchingOptions}
                  placeholder={`Select ${column.name.toLowerCase()}`}
                  searchPlaceholder={`Search ${column.name.toLowerCase()}...`}
                  emptyText={`No ${column.name.toLowerCase()} found.`}
                  className={FIELD_CONTROL_CLASS}
                  footer={
                    isOptionBacked(column.type)
                      ? (close) => (
                          <OptionFieldActions
                            fieldId={column.id}
                            fieldLabel={column.name}
                            search={search}
                            moduleKey={optionModule}
                            team={team}
                            onAdded={field.onChange}
                            onClose={close}
                          />
                        )
                      : undefined
                  }
                />
              </FormControl>
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
            <FormItem className="mt-auto flex h-11 flex-row items-center space-x-3 space-y-0 rounded-md border px-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel
                className={cn(LABEL_CLASS, "cursor-pointer leading-none")}
              >
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
            <FormItem className={FIELD_ITEM_CLASS}>
              {label}
              {helperText}
              <FormControl>
                <LocationCell
                  value={field.value}
                  onChange={field.onChange}
                  onSelectComponents={applyAddressComponents}
                  className={cn(
                    FIELD_CONTROL_CLASS,
                    "rounded-md border-input bg-transparent text-sm shadow-xs"
                  )}
                />
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
            <FormItem className={FIELD_ITEM_CLASS}>
              {label}
              {helperText}
              <FormControl>
                {layout?.multiline ? (
                  <Textarea
                    {...field}
                    rows={4}
                    placeholder={placeholderFor(column.name, column.type)}
                    className="mt-auto min-h-24 w-full"
                  />
                ) : (
                  <Input
                    {...field}
                    placeholder={placeholderFor(column.name, column.type)}
                    className={FIELD_CONTROL_CLASS}
                  />
                )}
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      );
  }
};

export default RecordCreatePage;
