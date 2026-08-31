import { useModules } from "@/hooks/use-modules";
import { getModuleColumns } from "@/services/board/board-module-service";
import {
  createCustomAnalytic,
  previewCustomAnalytic,
  updateCustomAnalytic,
  type CustomAnalytic,
  type CustomAnalyticInput,
} from "@/services/custom-analytics/custom-analytics-service";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  schema,
  type BuilderValues,
} from "./custom-analytics-builder-schema";
import { CustomAnalyticsChartFields } from "./custom-analytics-chart-fields";
import { CustomAnalyticsPreview } from "./custom-analytics-preview";

const CHART_TYPES = [
  { value: "BAR", label: "Bar chart" },
  { value: "PIE", label: "Pie chart" },
  { value: "LINE", label: "Line chart" },
  { value: "KPI", label: "KPI number" },
  { value: "TABLE", label: "Table" },
  { value: "MAP", label: "County map" },
];

// Six-column grid, so a third and a half are both whole rows of tiles.
const TILE_SPANS = [
  { value: "THIRD", label: "One third" },
  { value: "HALF", label: "Half" },
  { value: "TWO_THIRDS", label: "Two thirds" },
  { value: "FULL", label: "Full width" },
];

// Blank means no bound; anything unparseable is treated the same rather than
// sent as NaN.
function toBound(value: string): number | null {
  const parsed = Number(value.trim());
  return value.trim() && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function toInput(values: BuilderValues): CustomAnalyticInput {
  return {
    moduleId: values.moduleId,
    chartType: values.chartType,
    metricFieldId: values.metricFieldId || null,
    metricSource: values.metricSource,
    durationFieldId:
      values.metricSource === "DAYS_TO_CHANGE" && values.durationFieldId
        ? values.durationFieldId
        : null,
    metricAggregation: values.metricAggregation,
    marketingMeasure: values.marketingMeasure,
    marketingGroupBy:
      values.metricSource === "MARKETING_ACTIVITY" && values.marketingGroupBy
        ? values.marketingGroupBy
        : null,
    dimensionType: values.dimensionType,
    dimensionFieldId: values.dimensionFieldId || null,
    relationType:
      values.dimensionType === "RELATED_RECORD" && values.relationType
        ? values.relationType
        : null,
    relationDirection: values.relationDirection,
    relatedFieldId:
      values.dimensionType === "RELATED_RECORD" && values.relatedFieldId
        ? values.relatedFieldId
        : null,
    dateBucket: values.dateBucket,
    columnIds: values.chartType === "TABLE" ? values.columnIds : [],
    filter: {
      match: values.filterMatch,
      // A row the user added but never picked a field for is dropped rather
      // than sent as a condition on nothing.
      conditions: values.conditions.filter((condition) => condition.fieldId),
    },
    numeratorFilter: {
      match: values.numeratorMatch,
      conditions:
        values.metricAggregation === "PERCENT"
          ? values.numeratorConditions.filter((condition) => condition.fieldId)
          : [],
    },
    minGroupSize: toBound(values.minGroupSize),
    maxGroupSize: toBound(values.maxGroupSize),
    rangeDays: values.range === "0" ? null : Number(values.range),
    groupLimit: ["BAR", "PIE", "MAP"].includes(values.chartType)
      ? Number(values.groupLimit)
      : null,
    tileSpan: values.tileSpan,
  };
}

const BLANK_VALUES: BuilderValues = {
  name: "",
  moduleId: "",
  chartType: "BAR",
  tileSpan: "HALF",
  metricFieldId: "",
  metricSource: "FIELD_VALUE",
  durationFieldId: "",
  marketingMeasure: "INTERACTIONS",
  marketingGroupBy: "",
  metricAggregation: "COUNT",
  dimensionType: "FIELD",
  relationType: "",
  relationDirection: "OUTGOING",
  relatedModuleId: "",
  relatedFieldId: "",
  dimensionFieldId: "",
  dateBucket: "DAY",
  columnIds: [],
  range: "90",
  groupLimit: "10",
  filterMatch: "AND",
  conditions: [],
  numeratorMatch: "AND",
  numeratorConditions: [],
  minGroupSize: "",
  maxGroupSize: "",
};

// relatedModuleId is deliberately left blank: it only populates the related
// field picker, and relatedFieldId carries the saved value through untouched.
function toBuilderValues(analytic: CustomAnalytic): BuilderValues {
  return {
    ...BLANK_VALUES,
    name: analytic.name,
    moduleId: analytic.moduleId,
    chartType: analytic.chartType,
    tileSpan: analytic.tileSpan,
    metricFieldId: analytic.metricFieldId ?? "",
    metricSource: analytic.metricSource,
    durationFieldId: analytic.durationFieldId ?? "",
    marketingMeasure: analytic.marketingMeasure,
    marketingGroupBy: analytic.marketingGroupBy ?? "",
    metricAggregation: analytic.metricAggregation,
    dimensionType: analytic.dimensionType,
    relationType: analytic.relationType ?? "",
    relationDirection: analytic.relationDirection,
    relatedFieldId: analytic.relatedFieldId ?? "",
    dimensionFieldId: analytic.dimensionFieldId ?? "",
    dateBucket: analytic.dateBucket ?? "DAY",
    columnIds: analytic.columnIds,
    range: String(analytic.rangeDays ?? 0),
    groupLimit: String(analytic.groupLimit ?? 10),
    filterMatch: analytic.filter.match,
    conditions: analytic.filter.conditions as BuilderValues["conditions"],
    numeratorMatch: analytic.numeratorFilter?.match ?? "AND",
    numeratorConditions: (analytic.numeratorFilter?.conditions ??
      []) as BuilderValues["conditions"],
    minGroupSize: analytic.minGroupSize ? String(analytic.minGroupSize) : "",
    maxGroupSize: analytic.maxGroupSize ? String(analytic.maxGroupSize) : "",
  };
}

type CustomAnalyticsBuilderFormProps = {
  // Present for an edit; absent creates a new chart.
  analytic?: CustomAnalytic;
  // Set by a module's own analytics page, which cannot change the module.
  lockedModuleId?: string;
  // Set when the chart is being created from inside a dashboard, so it lands
  // on that dashboard rather than in a registry nobody opens.
  attachToDashboardId?: string;
  onCancel: () => void;
  onSaved: () => void;
  // The dialog supplies its own footer chrome; a page renders a plain row.
  renderFooter?: (actions: React.ReactNode) => React.ReactNode;
};

export function CustomAnalyticsBuilderForm({
  analytic,
  lockedModuleId,
  attachToDashboardId,
  onCancel,
  onSaved,
  renderFooter,
}: CustomAnalyticsBuilderFormProps) {
  const queryClient = useQueryClient();
  const { data: modules = [] } = useModules();

  const form = useForm<BuilderValues>({
    resolver: zodResolver(schema),
    defaultValues: analytic
      ? toBuilderValues(analytic)
      : { ...BLANK_VALUES, moduleId: lockedModuleId ?? "" },
  });

  const moduleId = form.watch("moduleId");
  const chartType = form.watch("chartType");
  const dimensionType = form.watch("dimensionType");
  const columnIds = form.watch("columnIds");
  const metricFieldId = form.watch("metricFieldId");
  const metricAggregation = form.watch("metricAggregation");
  const metricSource = form.watch("metricSource");
  // Watched so a row's value input follows its own operator as it changes.
  const conditions = form.watch("conditions");
  const numeratorConditions = form.watch("numeratorConditions");
  const moduleKey = modules.find((m) => m.id === moduleId)?.key;

  const { data: columns = [] } = useQuery({
    queryKey: ["module-columns", moduleKey],
    queryFn: () => getModuleColumns(moduleKey!),
    enabled: Boolean(moduleKey),
  });

  // The related module is only a lookup for the field list, so it is watched
  // rather than sent: the API stores the field id alone.
  const relatedModuleId = form.watch("relatedModuleId");
  const relatedModuleKey = modules.find((m) => m.id === relatedModuleId)?.key;

  const { data: relatedColumns = [] } = useQuery({
    queryKey: ["module-columns", relatedModuleKey],
    queryFn: () => getModuleColumns(relatedModuleKey!),
    enabled: Boolean(relatedModuleKey),
  });

  const previewMutation = useMutation({
    mutationFn: previewCustomAnalytic,
    onError: () => toast.error("Failed to preview chart"),
  });

  const saveMutation = useMutation({
    mutationFn: (values: BuilderValues) =>
      analytic
        ? updateCustomAnalytic(analytic.id, {
            ...toInput(values),
            name: values.name,
          })
        : createCustomAnalytic({
            ...toInput(values),
            name: values.name,
            dashboardId: attachToDashboardId ?? null,
          }),
    onSuccess: (saved) => {
      toast.success(analytic ? "Chart updated" : "Chart saved");
      queryClient.invalidateQueries({ queryKey: ["custom-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["custom-analytic", saved.id] });
      // A saved chart may sit on a dashboard whose rendered result just changed.
      queryClient.invalidateQueries({
        queryKey: ["custom-analytic-dashboard-run"],
      });
      previewMutation.reset();
      onSaved();
    },
    onError: () => toast.error("Failed to save chart"),
  });

  const toggleColumn = (fieldId: string) =>
    form.setValue(
      "columnIds",
      columnIds.includes(fieldId)
        ? columnIds.filter((id) => id !== fieldId)
        : [...columnIds, fieldId],
      { shouldValidate: true }
    );

  const metricFieldLabel =
    columns.find((column) => column.id === metricFieldId)?.name ??
    (metricAggregation === "COUNT" ? "Count" : "Value");

  const actions = (
    <>
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={form.handleSubmit((values) =>
          previewMutation.mutate(toInput(values))
        )}
        disabled={previewMutation.isPending}
      >
        Preview
      </Button>
      <Button type="submit" disabled={saveMutation.isPending}>
        {analytic ? "Save changes" : "Save chart"}
      </Button>
    </>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chart name</FormLabel>
                <FormControl>
                  <Input placeholder="Referrals by county" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!lockedModuleId && (
            <FormField
              control={form.control}
              name="moduleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      // Metric/dimension/column selections belong to a
                      // module, so they cannot carry over.
                      form.setValue("metricFieldId", "");
                      form.setValue("dimensionFieldId", "");
                      form.setValue("columnIds", []);
                      form.setValue("durationFieldId", "");
                      form.setValue("conditions", []);
                      form.setValue("numeratorConditions", []);
                      field.onChange(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a module" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="chartType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chart type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CHART_TYPES.map((type) => (
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

          <FormField
            control={form.control}
            name="tileSpan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tile width on a dashboard</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TILE_SPANS.map((span) => (
                      <SelectItem key={span.value} value={span.value}>
                        {span.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <CustomAnalyticsChartFields
            control={form.control}
            chartType={chartType}
            dimensionType={dimensionType}
            columns={columns}
            relatedColumns={relatedColumns}
            modules={modules}
            relatedModuleId={relatedModuleId}
            columnIds={columnIds}
            conditions={conditions}
            numeratorConditions={numeratorConditions}
            metricAggregation={metricAggregation}
            metricSource={metricSource}
            onToggleColumn={toggleColumn}
          />

          {previewMutation.data && (
            <div className="rounded-lg border border-border p-3">
              <CustomAnalyticsPreview
                result={previewMutation.data}
                name={form.watch("name") || "Preview"}
                metricLabel={metricFieldLabel}
              />
            </div>
          )}
        </div>

        {renderFooter ? (
          renderFooter(actions)
        ) : (
          <div className="flex justify-end gap-2 pt-6">{actions}</div>
        )}
      </form>
    </Form>
  );
}
