import { AiSummaryCard } from "@/components/analytics/ai-summary-card";
import { getApiErrorMessage } from "@/lib/helper/helper";
import { getDashboardInsights } from "@/services/custom-analytics/custom-analytic-dashboard-service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type ModuleAnalyticsInsightsProps = {
  dashboardId: string;
  dateWindow: { start: Date; end: Date } | null;
  label: string;
};

export function ModuleAnalyticsInsights({
  dashboardId,
  dateWindow,
  label,
}: ModuleAnalyticsInsightsProps) {
  const queryClient = useQueryClient();

  const queryKey = [
    "dashboard-insights",
    dashboardId,
    dateWindow?.start.toISOString() ?? null,
    dateWindow?.end.toISOString() ?? null,
  ];

  const {
    data: insights,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey,
    queryFn: () => getDashboardInsights(dashboardId, dateWindow),
    // The model call is slow and the result is cached server-side; a refetch
    // on every focus would spend a generation for nothing.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const regenerate = useMutation({
    mutationFn: () => getDashboardInsights(dashboardId, dateWindow, true),
    onSuccess: (fresh) => queryClient.setQueryData(queryKey, fresh),
  });

  const sections = [
    { title: "Key Insights", items: insights?.key_insights },
    { title: "Bottlenecks", items: insights?.bottlenecks },
    { title: "Opportunities", items: insights?.opportunities },
    {
      title: "Short-Term Strategy",
      items: insights?.recommended_strategy?.short_term,
    },
    {
      title: "Long-Term Strategy",
      items: insights?.recommended_strategy?.long_term,
    },
    { title: "Final Recommendations", text: insights?.final_recommendations },
  ];

  return (
    <AiSummaryCard
      isLoading={isPending || regenerate.isPending}
      preview={insights?.executive_summary}
      sections={sections}
      fallbackPreview={`Insights will appear here once enough ${label.toLowerCase()} activity is recorded.`}
      error={isError ? getApiErrorMessage(error, "Failed to load insights") : null}
      onRegenerate={() => regenerate.mutate()}
    />
  );
}
