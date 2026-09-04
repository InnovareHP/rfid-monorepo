import type { TaskInsight } from "@/lib/helper/task-insights";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { cn } from "@dashboard/ui/lib/utils";
import { ArrowDown, ChevronUp, Sparkles } from "lucide-react";
import { useState } from "react";

const PREVIEW_COUNT = 3;

type TaskInsightCardProps = {
  insights: TaskInsight[];
  isLoading?: boolean;
  className?: string;
};

export const TaskInsightCard = ({
  insights,
  isLoading,
  className,
}: TaskInsightCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? insights : insights.slice(0, PREVIEW_COUNT);

  return (
    <Card
      className={cn(
        "rounded-2xl border-chart-seq-2/60 bg-brand/[0.03] shadow-none",
        className
      )}
    >
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:gap-8">
        <img
          src="/branding/Mascot/Refidly%20Brand%20Mascot-02%202.png"
          alt=""
          className="size-40 shrink-0 self-center object-contain"
          loading="lazy"
          decoding="async"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <h3 className="text-base font-semibold text-foreground">
            AI Powered Insight
          </h3>

          {isLoading ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            <div className="flex flex-col gap-4 rounded-xl bg-background px-5 py-4">
              {visible.map((insight) => (
                <div key={insight.title} className="flex items-start gap-3">
                  <Sparkles
                    className="mt-0.5 size-4 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {insight.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {insight.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            className="h-11 w-fit rounded-lg bg-brand px-5 text-sm font-medium hover:bg-brand/90"
            disabled={insights.length <= PREVIEW_COUNT}
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
};
