import { getLeadAnalysis } from "@/services/lead/lead-service";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
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
  DialogTrigger,
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
import { useState } from "react";

// --- Types (Ensure this matches the service layer) ---
export type LeadAnalyze = {
  leadId: string;
  leadName: string;
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
  leadId: string;
  dateStart?: string;
  dateEnd?: string;
}

export function AnalyzeLeadDialog({
  leadId,
  dateStart,
  dateEnd,
}: AnalyzeLeadDialogProps) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["lead-analysis", leadId],
    queryFn: () => getLeadAnalysis(leadId),
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const getEngagementConfig = (level: string) => {
    switch (level?.toLowerCase()) {
      case "high":
        return {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
          text: "text-emerald-700",
          icon: TrendingUp,
          dot: "bg-emerald-500",
        };
      case "medium":
        return {
          badge: "bg-amber-50 text-amber-700 border-amber-200",
          text: "text-amber-700",
          icon: BarChart3,
          dot: "bg-amber-500",
        };
      case "low":
        return {
          badge: "bg-rose-50 text-rose-700 border-rose-200",
          text: "text-rose-700",
          icon: AlertCircle,
          dot: "bg-rose-500",
        };
      default:
        return {
          badge: "bg-gray-50 text-gray-700 border-gray-200",
          text: "text-gray-700",
          icon: BarChart3,
          dot: "bg-gray-500",
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
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Analyze
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Custom Header with Gradient */}
        <div className="px-6 pt-6 pb-5 border-b bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-gray-900">
                    Organization Analysis
                  </DialogTitle>
                  {data && (
                    <p className="text-sm text-gray-600 mt-0.5 font-medium">
                      {data.leadName || data.leadId}
                    </p>
                  )}
                </div>
              </div>
              <DialogDescription className="text-sm text-gray-600 leading-relaxed">
                Comprehensive insights and engagement metrics
                {(dateStart || dateEnd) && (
                  <span className="text-blue-700 font-semibold ml-2">
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
              <div className="p-4 rounded-full bg-red-50 mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-sm text-red-600 font-medium">
                {error instanceof Error
                  ? error.message
                  : "Failed to load analysis"}
              </p>
            </div>
          ) : data ? (
            <>
              {!hasSufficientData(data) ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-6 rounded-2xl bg-slate-50 mb-4">
                    <ClipboardList className="h-12 w-12 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Insufficient Data
                  </h3>
                  <p className="text-sm text-gray-600 max-w-md">
                    There aren't enough interactions or touchpoints recorded in
                    the specified date range to generate a meaningful analysis.
                  </p>
                </div>
              ) : (
                <div className="space-y-6 py-6">
                  {/* Top Stats Row with Enhanced Design */}
                  <div className="grid grid-cols-3 gap-4">
                    {/* Engagement Level */}
                    <Card className="border-2 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-gray-50">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
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
                    <Card className="border-2 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-blue-50">
                      <CardContent className="p-5">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          Total Interactions
                        </p>
                        <div className="flex items-baseline gap-2">
                          <p className="text-3xl font-bold text-blue-600">
                            {data.summary.totalInteractions}
                          </p>
                          <span className="text-xs text-gray-500 font-medium">
                            events
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Assigned To */}
                    <Card className="border-2 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-purple-50">
                      <CardContent className="p-5">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          Assigned To
                        </p>
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-purple-100">
                            <UserCheck className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="text-sm font-bold text-gray-900 truncate">
                            {data.assignedTo}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Executive Summary with Enhanced Design */}
                  <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-xl transition-shadow bg-gradient-to-r from-blue-50/50 to-indigo-50/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-bold flex items-center gap-2.5 text-gray-900">
                        <div className="p-2 rounded-lg bg-blue-100">
                          <MessageSquare className="h-4 w-4 text-blue-600" />
                        </div>
                        Executive Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-gray-700 font-medium">
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
                          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md">
                            <BarChart3 className="h-4 w-4 text-white" />
                          </div>
                          <h4 className="text-base font-bold text-gray-900">
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
                                  className="flex items-center justify-between p-3.5 rounded-xl border-2 hover:border-indigo-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all group"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 transition-colors">
                                      <Icon className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <span className="text-sm font-semibold text-gray-700 capitalize">
                                      {tp.type.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold text-indigo-600">
                                      {tp.count}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="p-3 rounded-full bg-slate-100 mb-2">
                              <MessageSquare className="h-6 w-6 text-slate-400" />
                            </div>
                            <p className="text-sm text-gray-500 font-medium">
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
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-md">
                              <Building2 className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="text-base font-bold text-gray-900">
                              Facilities Covered
                            </h4>
                            <Badge
                              variant="outline"
                              className="ml-auto bg-blue-50 text-blue-700 border-blue-300 font-bold px-2.5 py-1"
                            >
                              {data.summary.facilitiesCovered.length}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl min-h-[4rem] border-2 border-blue-100">
                            {data.summary.facilitiesCovered.length > 0 ? (
                              data.summary.facilitiesCovered.map((facility) => (
                                <Badge
                                  key={facility}
                                  variant="secondary"
                                  className="bg-white border-2 border-blue-200 font-semibold text-blue-700 px-3 py-1.5 hover:bg-blue-100 transition-colors"
                                >
                                  {facility}
                                </Badge>
                              ))
                            ) : (
                              <div className="w-full flex flex-col items-center justify-center py-4">
                                <Building2 className="h-6 w-6 text-blue-300 mb-1" />
                                <span className="text-xs text-blue-500 font-medium">
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
                            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-md">
                              <Users className="h-4 w-4 text-white" />
                            </div>
                            <h4 className="text-base font-bold text-gray-900">
                              Stakeholders
                            </h4>
                            <Badge
                              variant="outline"
                              className="ml-auto bg-purple-50 text-purple-700 border-purple-300 font-bold px-2.5 py-1"
                            >
                              {data.summary.peopleContacted.length}
                            </Badge>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl min-h-[4rem] border-2 border-purple-100">
                            {data.summary.peopleContacted.length > 0 ? (
                              <ul className="space-y-2.5">
                                {data.summary.peopleContacted.map((person) => (
                                  <li
                                    key={person}
                                    className="flex items-center gap-3 text-sm bg-white rounded-lg p-2.5 border border-purple-200 hover:border-purple-300 transition-colors"
                                  >
                                    <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
                                    <span className="font-semibold text-gray-700">
                                      {person}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="w-full flex flex-col items-center justify-center py-4">
                                <Users className="h-6 w-6 text-purple-300 mb-1" />
                                <span className="text-xs text-purple-500 font-medium">
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
