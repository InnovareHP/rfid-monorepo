import {
  createCustomAnalytic,
  deleteCustomAnalytic,
  getCustomAnalytic,
  updateCustomAnalytic,
  type CustomAnalytic,
  type CustomAnalyticTileSpan,
} from "@/services/custom-analytics/custom-analytics-service";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Every chart action changes what a dashboard renders, so they share one
// invalidation set rather than each caller remembering the five keys.
export function useAnalyticChartActions() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["custom-analytics"] });
    queryClient.invalidateQueries({ queryKey: ["custom-analytic-dashboards"] });
    // No id in the key: a chart can sit on more than one dashboard's cache,
    // and a deleted one is detached from every dashboard it was on.
    queryClient.invalidateQueries({
      queryKey: ["custom-analytic-dashboard-run"],
    });
    queryClient.invalidateQueries({
      queryKey: ["custom-analytic-dashboard-preview"],
    });
    queryClient.invalidateQueries({ queryKey: ["custom-analytic-dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["module-default-dashboard"] });
  };

  const setWidth = useMutation({
    mutationFn: ({
      id,
      tileSpan,
    }: {
      id: string;
      tileSpan: CustomAnalyticTileSpan;
    }) => updateCustomAnalytic(id, { tileSpan }),
    onSuccess: invalidate,
    onError: () => toast.error("Failed to resize chart"),
  });

  // Copied field by field from the saved chart, so a duplicate carries the
  // conditions and parameters the original was built with.
  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const source = await getCustomAnalytic(id);
      return createCustomAnalytic(toDuplicateInput(source));
    },
    onSuccess: () => {
      toast.success("Chart duplicated");
      invalidate();
    },
    onError: () => toast.error("Failed to duplicate chart"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCustomAnalytic(id),
    onSuccess: () => {
      toast.success("Chart deleted");
      invalidate();
    },
    onError: () => toast.error("Failed to delete chart"),
  });

  return { setWidth, duplicate, remove };
}

function toDuplicateInput(source: CustomAnalytic) {
  return {
    name: `${source.name} copy`,
    moduleId: source.moduleId,
    chartType: source.chartType,
    metricFieldId: source.metricFieldId,
    metricAggregation: source.metricAggregation,
    metricSource: source.metricSource,
    durationFieldId: source.durationFieldId,
    marketingMeasure: source.marketingMeasure,
    marketingGroupBy: source.marketingGroupBy,
    dimensionType: source.dimensionType,
    dimensionFieldId: source.dimensionFieldId,
    dateBucket: source.dateBucket ?? "DAY",
    columnIds: source.columnIds,
    filter: source.filter,
    numeratorFilter: source.numeratorFilter ?? {
      match: "AND" as const,
      conditions: [],
    },
    rangeDays: source.rangeDays,
    groupLimit: source.groupLimit,
    minGroupSize: source.minGroupSize,
    maxGroupSize: source.maxGroupSize,
    relationType: source.relationType,
    relationDirection: source.relationDirection,
    relatedFieldId: source.relatedFieldId,
    tileSpan: source.tileSpan,
  };
}
