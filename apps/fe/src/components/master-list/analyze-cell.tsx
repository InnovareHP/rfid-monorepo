import { getLeadAnalysis } from "@/services/lead/lead-service";
import type { LeadAnalyze } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@dashboard/ui/components/dialog";
import { ScrollArea } from "@dashboard/ui/components/scroll-area";
import { Separator } from "@dashboard/ui/components/separator";
import LoadingSkeleton from "@dashboard/ui/components/skeleton-loader";
import { ReferralActivityCard } from "./referral-activity-card";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Building2,
  Calendar,
  ClipboardList,
  Mail,
  MessageSquare,
  Phone,
  TrendingUp,
  UserCheck,
  Users,
  Video,
} from "lucide-react";

interface AnalyzeLeadDialogProps {
  recordId: string | null;
  dateStart?: string;
  dateEnd?: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function AnalyzeLeadDialog({
  recordId,
  dateStart,
  dateEnd,
  open,
  setOpen,
}: AnalyzeLeadDialogProps) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["lead-analysis", recordId],
    queryFn: () => getLeadAnalysis(recordId ?? ""),
    enabled: open && !!recordId,
    staleTime: 1000 * 60 * 5,
  });

  const getEngagementConfig = (level: string) => {
    switch (level?.toLowerCase()) {
      case "high":
        return {
          badge: "bg-success/10 text-success border-success/30",
          text: "text-success",
          icon: TrendingUp,
          dot: "bg-success",
        };
      case "medium":
        return {
          badge: "bg-warning/10 text-warning border-warning/30",
          text: "text-warning",
          icon: BarChart3,
          dot: "bg-warning",
        };
      case "low":
        return {
          badge: "bg-destructive/10 text-destructive border-destructive/30",
          text: "text-destructive",
          icon: AlertCircle,
          dot: "bg-destructive",
        };
      default:
        return {
          badge: "bg-muted text-foreground border-border",
          text: "text-foreground",
          icon: BarChart3,
          dot: "bg-muted-foreground",
        };
    }
  };

  const getTouchpointIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("email")) return Mail;
    if (lowerType.includes("call") || lowerType.includes("phone")) return Phone;
    if (lowerType.includes("meeting") || lowerType.includes("visit"))
      return Video;
    if (lowerType.includes("event")) return Calendar;
    return MessageSquare;
  };

  const hasSufficientData = (analysis: LeadAnalyze) => {
    if (!analysis || !analysis.summary) return false;

    if (analysis.summary.referrals.count > 0) return true;

    if (analysis.summary.totalInteractions === 0) return false;

    const { facilitiesCovered, peopleContacted } = analysis.summary;
    if (facilitiesCovered.length === 0 && peopleContacted.length === 0)
      return false;

    return true;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent variant="shell" className="max-w-4xl">
        {/* Custom Header with Gradient */}
        <div className="shrink-0 border-b bg-table-header px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-lg bg-primary p-2.5">
                  <BarChart3 className="size-5 text-primary-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold text-foreground">
                    Organization Analysis
                  </DialogTitle>
                  {data && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {data.recordName || data.recordId}
                    </p>
                  )}
                </div>
              </div>
              <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
                Comprehensive insights and engagement metrics
                {(dateStart || dateEnd) && (
                  <span className="text-primary font-semibold ml-2">
                    • {dateStart || "Start"} to {dateEnd || "End"}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1 px-4 sm:px-6">
          {isLoading ? (
            <div className="py-8">
              <LoadingSkeleton />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="p-4 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-sm text-destructive font-medium">
                {error instanceof Error
                  ? error.message
                  : "Failed to load analysis"}
              </p>
            </div>
          ) : data ? (
            <>
              {!hasSufficientData(data) ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 rounded-full bg-muted p-6">
                    <ClipboardList className="size-10 text-muted-foreground" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    Insufficient Data
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    There aren't enough interactions or touchpoints recorded in
                    the specified date range to generate a meaningful analysis.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 py-6">
                  {/* Top Stats Row with Enhanced Design */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Engagement Level */}
                    <Card className="bg-card">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Engagement
                          </p>
                          {(() => {
                            const config = getEngagementConfig(
                              data.summary.engagementLevel
                            );
                            const EngagementIcon = config.icon;
                            return (
                              <div
                                className={`p-1.5 rounded-lg ${config.badge.split(" ")[0]}`}
                              >
                                <EngagementIcon
                                  className={`h-4 w-4 ${config.text}`}
                                />
                              </div>
                            );
                          })()}
                        </div>
                        <Badge
                          variant="outline"
                          className={`${
                            getEngagementConfig(data.summary.engagementLevel)
                              .badge
                          } text-sm font-semibold px-3 py-1`}
                        >
                          {data.summary.engagementLevel}
                        </Badge>
                      </CardContent>
                    </Card>

                    {/* Total Interactions */}
                    <Card className="bg-card">
                      <CardContent className="p-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Total Interactions
                        </p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-semibold text-primary">
                            {data.summary.totalInteractions}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            events
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Referrals Sent */}
                    <Card className="bg-card">
                      <CardContent className="p-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Referrals Sent
                        </p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-semibold text-primary">
                            {data.summary.referrals.count}
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {data.summary.referrals.perWeek}/week
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assigned To */}
                    <Card className="bg-card">
                      <CardContent className="p-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Assigned To
                        </p>
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-md bg-primary/10 p-1.5">
                            <UserCheck className="size-4 text-primary" />
                          </div>
                          <span className="truncate text-sm font-medium text-foreground">
                            {data.assignedTo ?? "Unassigned"}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Executive Summary with Enhanced Design */}
                  <Card className="border-l-4 border-l-primary bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2.5 text-base font-semibold text-foreground">
                        <div className="rounded-md bg-primary/10 p-2">
                          <MessageSquare className="size-4 text-primary" />
                        </div>
                        Executive Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-foreground">
                        {data.summary.narrative}
                      </p>
                    </CardContent>
                  </Card>

                  <Separator />

                  {/* Detailed Metrics Grid with Enhanced Cards */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <ReferralActivityCard referrals={data.summary.referrals} />

                    {/* Touchpoints */}
                    <Card>
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-md bg-primary p-2">
                            <BarChart3 className="size-4 text-primary-foreground" />
                          </div>
                          <h4 className="text-base font-semibold text-foreground">
                            Touchpoints
                          </h4>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {data.summary.touchpointsUsed.length > 0 ? (
                          <div className="space-y-2.5">
                            {data.summary.touchpointsUsed.map((tp) => {
                              const Icon = getTouchpointIcon(tp.type);
                              return (
                                <div
                                  key={tp.type}
                                  className="group flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="rounded-md bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                                      <Icon className="size-4 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium capitalize text-foreground">
                                      {tp.type.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl font-semibold text-primary">
                                      {tp.count}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="mb-2 rounded-full bg-muted p-3">
                              <MessageSquare className="size-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              No touchpoints recorded
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Facilities & People */}
                    <Card>
                      <CardContent className="space-y-6 p-6">
                        {/* Facilities */}
                        <div>
                          <div className="flex items-center gap-2.5 mb-4">
                            <div className="rounded-md bg-primary p-2">
                              <Building2 className="size-4 text-primary-foreground" />
                            </div>
                            <h4 className="text-base font-semibold text-foreground">
                              Facilities Covered
                            </h4>
                            <Badge
                              variant="outline"
                              className="ml-auto border-primary/40 bg-primary/10 px-2.5 py-1 font-semibold text-primary"
                            >
                              {data.summary.facilitiesCovered.length}
                            </Badge>
                          </div>
                          <div className="flex min-h-16 flex-wrap gap-2 rounded-lg border bg-muted p-4">
                            {data.summary.facilitiesCovered.length > 0 ? (
                              data.summary.facilitiesCovered.map((facility) => (
                                <Badge
                                  key={facility}
                                  variant="secondary"
                                  className="border-primary/30 bg-card px-3 py-1.5 font-medium text-primary transition-colors hover:bg-primary/10"
                                >
                                  {facility}
                                </Badge>
                              ))
                            ) : (
                              <div className="w-full flex flex-col items-center justify-center py-4">
                                <Building2 className="mb-1 size-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  No facilities recorded
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <Separator />

                        {/* People Contacted */}
                        <div>
                          <div className="flex items-center gap-2.5 mb-4">
                            <div className="rounded-md bg-primary p-2">
                              <Users className="size-4 text-primary-foreground" />
                            </div>
                            <h4 className="text-base font-semibold text-foreground">
                              Stakeholders
                            </h4>
                            <Badge
                              variant="outline"
                              className="ml-auto border-primary/30 bg-primary/10 px-2.5 py-1 font-semibold text-primary"
                            >
                              {data.summary.peopleContacted.length}
                            </Badge>
                          </div>
                          <div className="min-h-16 rounded-lg border bg-muted p-4">
                            {data.summary.peopleContacted.length > 0 ? (
                              <ul className="space-y-2.5">
                                {data.summary.peopleContacted.map((person) => (
                                  <li
                                    key={person}
                                    className="flex items-center gap-3 rounded-md border bg-card p-2.5 text-sm"
                                  >
                                    <div className="size-2 rounded-full bg-primary" />
                                    <span className="font-medium text-foreground">
                                      {person}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="w-full flex flex-col items-center justify-center py-4">
                                <Users className="mb-1 size-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  No stakeholders recorded
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
