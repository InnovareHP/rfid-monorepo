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
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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

const priorityConfig = {
  high: {
    badge: "bg-red-50 text-red-700 border-red-300",
    card: "border-l-red-500",
    dot: "bg-red-500",
  },
  medium: {
    badge: "bg-amber-50 text-amber-700 border-amber-300",
    card: "border-l-amber-500",
    dot: "bg-amber-500",
  },
  low: {
    badge: "bg-primary/10 text-primary border-primary/40",
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
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to refresh suggestions"
      ),
  });

  const createActivityMutation = useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", recordId] });
      toast.success("Activity created");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create activity"),
  });

  if (isLoading) {
    return (
      <ScrollArea className="h-[calc(90vh-240px)] px-6 py-4">
        <div className="space-y-4">
          <div className="h-20 w-full rounded-xl bg-gradient-to-r from-primary/15 to-primary/15 animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 w-full rounded-xl bg-gradient-to-r from-gray-100 to-gray-50 animate-pulse"
            />
          ))}
          <div className="h-16 w-full rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 animate-pulse" />
        </div>
      </ScrollArea>
    );
  }

  if (isError) {
    return (
      <ScrollArea className="h-[calc(90vh-240px)] px-6 py-4">
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="p-4 rounded-full bg-red-50">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <p className="text-sm text-red-600 font-medium">
            {(error as any)?.response?.data?.message ??
              "Failed to load suggestions"}
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
              className={`h-3.5 w-3.5 ${regenerateMutation.isPending ? "animate-spin" : ""}`}
            />
            Regenerate
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="border-l-4 border-l-primary shadow-md bg-gradient-to-r from-primary/5 to-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Sparkles className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
                  AI Summary
                </p>
                <p className="text-sm leading-relaxed text-gray-700 font-medium">
                  {data.summary}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary shadow-md">
              <Lightbulb className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-bold text-gray-900">
              Suggested Actions
            </h3>
          </div>

          {data.suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-gray-500 font-medium">
                No suggestions right now
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Check back after there's more activity on this record.
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
                    className={`border-l-4 ${config.card} shadow-sm hover:shadow-md transition-all`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${config.dot}`}
                          />
                          <p className="text-sm font-bold text-gray-900">
                            {suggestion.action}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${config.badge} text-xs font-semibold shrink-0`}
                        >
                          {suggestion.priority.charAt(0).toUpperCase() +
                            suggestion.priority.slice(1)}
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 pl-[18px]">
                        {suggestion.reasoning}
                      </p>

                      <div className="flex items-center justify-between gap-2 ml-[18px]">
                        <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-lg font-semibold w-fit">
                          <Clock className="h-3.5 w-3.5" />
                          {suggestion.timing}
                        </div>
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
                          <ListChecks className="h-3.5 w-3.5" />
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

        {/* Risk Factors */}
        {data && data.riskFactors && data.riskFactors.length > 0 && (
          <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50/50 to-amber-50/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2.5 text-gray-900">
                <div className="p-2 rounded-lg bg-orange-100">
                  <ShieldAlert className="h-4 w-4 text-orange-600" />
                </div>
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {data &&
                  data.riskFactors.map((risk, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg border border-orange-200"
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                      <p className="text-sm text-gray-700 font-medium">
                        {risk}
                      </p>
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
