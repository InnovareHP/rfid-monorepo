import { useModules } from "@/hooks/use-modules";
import { getModuleColumns } from "@/services/board/board-module-service";
import {
  createCustomAnalytic,
  previewCustomAnalytic,
  type CustomAnalyticInput,
} from "@/services/custom-analytics/custom-analytics-service";
import { Button } from "@dashboard/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFormFooter,
  DialogFormHeader,
} from "@dashboard/ui/components/dialog";
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
import { ChartSpline } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CustomAnalyticsChartFields } from "./custom-analytics-chart-fields";
import {
  schema,
  type BuilderValues,
} from "./custom-analytics-builder-schema";
import { CustomAnalyticsPreview } from "./custom-analytics-preview";

const CHART_TYPES = [
  { value: "BAR", label: "Bar chart" },
  { value: "PIE", label: "Pie chart" },
  { value: "LINE", label: "Line chart" },
  { value: "KPI", label: "KPI number" },
  { value: "TABLE", label: "Table" },
];

type CustomAnalyticsBuilderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toInput(values: BuilderValues): CustomAnalyticInput {
  return {
    moduleId: values.moduleId,
    chartType: values.chartType,
    metricFieldId: values.metricFieldId || null,
    metricAggregation: values.metricAggregation,
    dimensionType: values.dimensionType,
    dimensionFieldId: values.dimensionFieldId || null,
    dateBucket: values.dateBucket,
    columnIds: values.chartType === "TABLE" ? values.columnIds : [],
    filter:
      values.filterFieldId && values.filterValue
        ? { [values.filterFieldId]: values.filterValue }
        : {},
    rangeDays: values.range === "0" ? null : Number(values.range),
  };
}

export function CustomAnalyticsBuilderDialog({
  open,
  onOpenChange,
}: CustomAnalyticsBuilderDialogProps) {
  const queryClient = useQueryClient();
  const { data: modules = [] } = useModules();

  const form = useForm<BuilderValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      moduleId: "",
      chartType: "BAR",
      metricFieldId: "",
      metricAggregation: "COUNT",
      dimensionType: "FIELD",
      dimensionFieldId: "",
      dateBucket: "DAY",
      columnIds: [],
      range: "90",
      filterFieldId: "",
      filterValue: "",
    },
  });

  const moduleId = form.watch("moduleId");
  const chartType = form.watch("chartType");
  const dimensionType = form.watch("dimensionType");
  const columnIds = form.watch("columnIds");
  const metricFieldId = form.watch("metricFieldId");
  const metricAggregation = form.watch("metricAggregation");
  const moduleKey = modules.find((m) => m.id === moduleId)?.key;

  const { data: columns = [] } = useQuery({
    queryKey: ["module-columns", moduleKey],
    queryFn: () => getModuleColumns(moduleKey!),
    enabled: Boolean(moduleKey),
  });

  const previewMutation = useMutation({
    mutationFn: previewCustomAnalytic,
    onError: () => toast.error("Failed to preview chart"),
  });

  const saveMutation = useMutation({
    mutationFn: (values: BuilderValues) =>
      createCustomAnalytic({ ...toInput(values), name: values.name }),
    onSuccess: (created) => {
      toast.success("Chart saved");
      queryClient.invalidateQueries({ queryKey: ["custom-analytics"] });
      queryClient.invalidateQueries({
        queryKey: ["custom-analytic", created.id],
      });
      form.reset();
      previewMutation.reset();
      onOpenChange(false);
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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) previewMutation.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogFormHeader
          icon={<ChartSpline />}
          title="New Chart"
          description="Pick a module, a metric, and how to group it."
        />

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
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
                        form.setValue("filterFieldId", "");
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

              <CustomAnalyticsChartFields
                control={form.control}
                chartType={chartType}
                dimensionType={dimensionType}
                columns={columns}
                columnIds={columnIds}
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

            <DialogFormFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
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
                Save chart
              </Button>
            </DialogFormFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
