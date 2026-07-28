import { AiSummaryCard, type AiInsightSection } from "./ai-summary-card";

type AnalyticsSummary = {
  executive_summary?: string;
  key_insights?: string[];
  bottlenecks?: string[];
  opportunities?: string[];
  recommended_strategy?: {
    short_term?: string[];
    long_term?: string[];
  };
  final_recommendations?: string;
};

function toSections(summary: AnalyticsSummary | undefined): AiInsightSection[] {
  return [
    { title: "Key Insights", items: summary?.key_insights },
    { title: "Bottlenecks", items: summary?.bottlenecks },
    { title: "Opportunities", items: summary?.opportunities },
    {
      title: "Short-Term Strategy",
      items: summary?.recommended_strategy?.short_term,
    },
    {
      title: "Long-Term Strategy",
      items: summary?.recommended_strategy?.long_term,
    },
    { title: "Final Recommendations", text: summary?.final_recommendations },
  ];
}

export default function AiSummary({
  isLoadingSummary,
  summary,
}: {
  isLoadingSummary: boolean;
  summary: AnalyticsSummary | undefined;
}) {
  return (
    <AiSummaryCard
      isLoading={isLoadingSummary}
      preview={summary?.executive_summary}
      sections={toSections(summary)}
      fallbackPreview="The Behavioral Referral Intelligence Report analyzes referral behavior across your organization."
    />
  );
}
