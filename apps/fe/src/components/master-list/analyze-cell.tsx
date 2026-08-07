import { getLeadAnalysis } from "@/services/lead/lead-service";
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

export type LeadAnalyze = {
  recordId: string;
  recordName: string;
  assignedTo: string;
  summary: {
    totalInteractions: number;
    facilitiesCovered: string[];
    touchpointsUsed: { type: string; count: number }[];
    peopleContacted: string[];
    engagementLevel: string;
    narrative: string;
  };
};

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

    if (analysis.summary.totalInteractions === 0) return false;

    const { facilitiesCovered, peopleContacted } = analysis.summary;
    if (facilitiesCovered.length === 0 && peopleContacted.length === 0)
      return false;

    return true;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Custom Header with Gradient */}
        <div className="px-6 pt-6 pb-5 border-b bg-primary/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-primary shadow-lg">
                  <BarChart3 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-foreground">
                    Organization Analysis
                  </DialogTitle>
                  {data && (
                    <p className="text-sm text-muted-foreground mt-0.5 font-medium">
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

        <ScrollArea className="flex-1 px-6">
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
                  <div className="p-6 rounded-2xl bg-muted mb-4">
                    <ClipboardList className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
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
                  <div className="grid grid-cols-3 gap-4">
                    {/* Engagement Level */}
                    <Card className="border-2 hover:shadow-lg transition-shadow bg-card">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
                    <Card className="border-2 hover:shadow-lg transition-shadow bg-gradient-to-br from-card to-primary/10">
                      <CardContent className="p-5">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                          Total Interactions
                        </p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-primary">
                            {data.summary.totalInteractions}
                          </p>
                          <span className="text-xs text-muted-foreground font-medium">
                            events
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assigned To */}
                    <Card className="border-2 hover:shadow-lg transition-shadow bg-gradient-to-br from-card to-primary/10">
                      <CardContent className="p-5">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                          Assigned To
                        </p>
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-primary/10">
                            <UserCheck className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-bold text-foreground truncate">
                            {data.assignedTo}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Executive Summary with Enhanced Design */}
                  <Card className="border-l-4 border-l-primary shadow-md hover:shadow-xl transition-shadow bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center gap-2.5 text-foreground">
                        <div className="p-2 rounded-lg bg-primary/15">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        Executive Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-foreground font-medium">
                        {data.summary.narrative}
                      </p>
                    </CardContent>
                  </Card>

                  <Separator />

                  {/* Detailed Metrics Grid with Enhanced Cards */}
                  <div className="grid gap-6 md:grid-cols-2">
                    {/* Touchpoints */}
                    <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-primary shadow-md">
                            <BarChart3 className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <h4 className="text-base font-bold text-foreground">
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
                                  className="flex items-center justify-between p-3.5 rounded-xl border-2 hover:border-primary/40 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/10 transition-all group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/15 group-hover:bg-primary/25 transition-colors">
                                      <Icon className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="text-sm font-semibold text-foreground capitalize">
                                      {tp.type.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold text-primary">
                                      {tp.count}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="p-3 rounded-full bg-muted mb-2">
                              <MessageSquare className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground font-medium">
                              No touchpoints recorded
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Facilities & People */}
                    <Card className="border-2 shadow-md hover:shadow-lg transition-shadow">
                      <CardContent className="p-6 space-y-6">
                        {/* Facilities */}
                        <div>
                          <div className="flex items-center gap-2.5 mb-4">
                            <div className="p-2 rounded-xl bg-primary shadow-md">
                              <Building2 className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <h4 className="text-base font-bold text-foreground">
                              Facilities Covered
                            </h4>
                            <Badge
                              variant="outline"
                              className="ml-auto bg-primary/10 text-primary border-primary/40 font-bold px-2.5 py-1"
                            >
                              {data.summary.facilitiesCovered.length}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 p-4 bg-primary/10 rounded-xl min-h-[4rem] border-2 border-primary/15">
                            {data.summary.facilitiesCovered.length > 0 ? (
                              data.summary.facilitiesCovered.map((facility) => (
                                <Badge
                                  key={facility}
                                  variant="secondary"
                                  className="bg-card border-2 border-primary/30 font-semibold text-primary px-3 py-1.5 hover:bg-primary/15 transition-colors"
                                >
                                  {facility}
                                </Badge>
                              ))
                            ) : (
                              <div className="w-full flex flex-col items-center justify-center py-4">
                                <Building2 className="h-6 w-6 text-primary/40 mb-1" />
                                <span className="text-xs text-primary font-medium">
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
                            <div className="p-2 rounded-xl bg-primary shadow-md">
                              <Users className="h-4 w-4 text-primary-foreground" />
                            </div>
                            <h4 className="text-base font-bold text-foreground">
                              Stakeholders
                            </h4>
                            <Badge
                              variant="outline"
                              className="ml-auto bg-primary/10 text-primary border-primary/30 font-bold px-2.5 py-1"
                            >
                              {data.summary.peopleContacted.length}
                            </Badge>
                          </div>
                          <div className="p-4 bg-primary/10 rounded-xl min-h-[4rem] border-2 border-primary/30">
                            {data.summary.peopleContacted.length > 0 ? (
                              <ul className="space-y-2.5">
                                {data.summary.peopleContacted.map((person) => (
                                  <li
                                    key={person}
                                    className="flex items-center gap-3 text-sm bg-card rounded-lg p-2.5 border border-primary/30 hover:border-primary/30 transition-colors"
                                  >
                                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                                    <span className="font-semibold text-foreground">
                                      {person}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="w-full flex flex-col items-center justify-center py-4">
                                <Users className="h-6 w-6 text-primary mb-1" />
                                <span className="text-xs text-primary font-medium">
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
