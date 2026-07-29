import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { ArrowDown, ChevronUp } from "lucide-react";
import { useState } from "react";

export type AiInsightSection = {
  title: string;
  items?: string[];
  text?: string;
};

type AiSummaryCardProps = {
  isLoading: boolean;
  preview: string | undefined;
  sections: AiInsightSection[];
  fallbackPreview?: string;
};

const DEFAULT_FALLBACK =
  "No AI summary is available yet for the current filters.";

function InsightSection({ title, items, text }: AiInsightSection) {
  if (!items?.length && !text) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {text ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
      ) : (
        <ul className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          {items?.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}

export function AiSummaryCard({
  isLoading,
  preview,
  sections,
  fallbackPreview = DEFAULT_FALLBACK,
}: AiSummaryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const hasSections = sections.some(
    (section) => section.items?.length || section.text
  );

  return (
    <Card className="rounded-2xl border-chart-seq-2/60 bg-brand/[0.03] shadow-none">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-8">
        <img
          src="/branding/Mascot/Refidly%20Brand%20Mascot-02%202.png"
          alt=""
          className="size-44 shrink-0 self-center object-contain"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h3 className="text-base font-semibold text-foreground">
            AI Powered Insight
          </h3>

          {isLoading && !preview ? (
            <div className="flex items-center gap-3 rounded-xl bg-background px-5 py-4">
              <div className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Analyzing your analytics data and generating insights...
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-background px-5 py-4 text-sm leading-relaxed text-muted-foreground">
              {preview ?? fallbackPreview}
            </p>
          )}

          {expanded && hasSections ? (
            <div className="space-y-4 rounded-xl bg-background px-5 py-4">
              {sections.map((section) => (
                <InsightSection key={section.title} {...section} />
              ))}
            </div>
          ) : null}

          <Button
            className="h-11 w-fit rounded-lg bg-brand px-5 text-sm font-medium hover:bg-brand/90"
            disabled={!hasSections}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? (
              <ChevronUp className="size-4" aria-hidden="true" />
            ) : (
              <ArrowDown className="size-4" aria-hidden="true" />
            )}
            {expanded ? "Hide Insights" : "View Full Insights"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
