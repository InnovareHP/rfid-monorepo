import {
  createActivity,
  getFollowUpSuggestions,
} from "@/services/lead/lead-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { ScrollArea } from "@dashboard/ui/components/scroll-area";
import { cn } from "@dashboard/ui/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Lightbulb,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/helper/helper";

const priorityConfig = {
  high: {
    badge: "border-destructive/40 bg-destructive/10 text-destructive",
    card: "border-l-destructive",
    dot: "bg-destructive",
  },
  medium: {
    badge: "border-warning/40 bg-warning/10 text-warning",
    card: "border-l-warning",
    dot: "bg-warning",
  },
  low: {
    badge: "border-primary/40 bg-primary/10 text-primary",
    card: "border-l-primary",
    dot: "bg-primary",
  },
};

export function FollowUpSuggestions({
  recordId,
  enabled,
}: {
  recordId: string;
  enabled: boolean;
}) {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["follow-up-suggestions", recordId],
    queryFn: () => getFollowUpSuggestions(recordId),
    enabled: enabled && !!recordId,
    staleTime: 1000 * 60 * 10,
  });

  const regenerateMutation = useMutation({
    mutationFn: () => getFollowUpSuggestions(recordId, true),
    onSuccess: (fresh) => {
      queryClient.setQueryData(["follow-up-suggestions", recordId], fresh);
      toast.success("Suggestions refreshed");
    },
    onError: (err: unknown) =>
      toast.error(
        getApiErrorMessage(err, "Failed to refresh suggestions")
      ),
  });

  const createActivityMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", recordId] });
      toast.success("Activity created");
    },
    onError: (err: unknown) =>
      toast.error(getApiErrorMessage(err, "Failed to create activity")),
  });

  if (isLoading) {
    return (
      <ScrollArea className="h-[calc(90vh-240px)] px-6 py-4">
        <div className="space-y-4">
          <div className="h-20 w-full animate-pulse rounded-lg bg-primary/10" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 w-full animate-pulse rounded-lg bg-muted"
            />
          ))}
          <div className="h-16 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </ScrollArea>
    );
  }

  if (isError) {
    return (
      <ScrollArea className="h-[calc(90vh-240px)] px-6 py-4">
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="size-8 text-destructive" />
          </div>
          <p className="text-sm font-medium text-destructive">
            {getApiErrorMessage(error, "Failed to load suggestions")}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </ScrollArea>
    );
  }

  if (!data) return null;

  return (
    <ScrollArea className="h-[calc(90vh-240px)] px-6 py-4">
      <div className="space-y-5">
        <div className="flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={regenerateMutation.isPending}
            onClick={() => regenerateMutation.mutate()}
          >
            <RefreshCw
              className={cn(
                "size-3.5",
                regenerateMutation.isPending && "animate-spin"
              )}
            />
            Regenerate
          </Button>
        </div>

        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-primary/10 p-2">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  AI Summary
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {data.summary}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-md bg-primary p-2">
              <Lightbulb className="size-4 text-primary-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Suggested Actions
            </h3>
          </div>

          {data.suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No suggestions right now
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Check back after there&apos;s more activity on this record.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.suggestions.map((suggestion, i) => {
                const config =
                  priorityConfig[suggestion.priority] || priorityConfig.medium;

                return (
                  <Card
                    key={i}
                    className={cn(
                      "border-l-4 transition-colors hover:border-primary/40",
                      config.card
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn("size-2 rounded-full", config.dot)}
                          />
                          <p className="text-sm font-medium text-foreground">
                            {suggestion.action}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 text-xs font-medium",
                            config.badge
                          )}
                        >
                          {suggestion.priority.charAt(0).toUpperCase() +
                            suggestion.priority.slice(1)}
                        </Badge>
                      </div>

                      <p className="mb-3 pl-4 text-sm text-muted-foreground">
                        {suggestion.reasoning}
                      </p>

                      <div className="ml-4 flex flex-wrap items-center justify-between gap-2">
                        <span className="flex w-fit items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                          <Clock className="size-3.5" />
                          {suggestion.timing}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={createActivityMutation.isPending}
                          onClick={() =>
                            createActivityMutation.mutate({
                              recordId,
                              title: suggestion.action,
                              description: `${suggestion.reasoning}\n\nSuggested timing: ${suggestion.timing}`,
                              activityType: "NOTE",
                            })
                          }
                        >
                          <ListChecks className="size-3.5" />
                          Create Activity
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {data.riskFactors && data.riskFactors.length > 0 && (
          <Card className="border-warning/30 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
                <div className="rounded-md bg-warning/10 p-2">
                  <ShieldAlert className="size-4 text-warning" />
                </div>
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {data.riskFactors.map((risk, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-md border bg-card p-3"
                  >
                    <ArrowRight className="size-3.5 shrink-0 text-warning" />
                    <p className="text-sm text-foreground">{risk}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
