import { getAnalytics } from "@/services/analytics/analytics-service";
import type { AnalyticsResponse } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@dashboard/ui/components/collapsible";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Ban,
  Building2,
  ChevronDown,
  ClipboardList,
  ShieldAlert,
  Star,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";
import * as Recharts from "recharts";

const TIER_CONFIG = {
  "Tier 1": { color: "bg-emerald-100 text-emerald-700", label: "Always Refers" },
  "Tier 2": { color: "bg-amber-100 text-amber-700", label: "Frequently Refers" },
  Infrequent: { color: "bg-gray-100 text-gray-600", label: "Infrequent" },
} as const;

interface ReferralAnalyticsStripProps {
  dateFrom: string | null;
  dateTo: string | null;
}

export default function ReferralAnalyticsStrip({
  dateFrom,
  dateTo,
}: ReferralAnalyticsStripProps) {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem("referral-analytics-open") !== "false";
    } catch {
      return true;
    }
  });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ["referral-pipeline-analytics", dateFrom, dateTo],
    queryFn: async () => {
      return (await getAnalytics(dateFrom, dateTo)) as AnalyticsResponse;
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    try {
      localStorage.setItem("referral-analytics-open", String(open));
    } catch {}
  };

  const {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    LineChart,
    Line,
    CartesianGrid,
  } = Recharts;

  const facilityBarData =
    analytics?.facilities?.map((f) => ({
      name: f.value ?? "Unknown",
      count: f._count.value,
    })) ?? [];

  const denialReasonData =
    analytics?.denials?.reasons?.map((d) => ({
      name: d.reason,
      count: d.count,
    })) ?? [];

  const denialTrendData = analytics?.denials?.monthlyTrend ?? [];

  const topFacility = facilityBarData[0]?.name ?? "N/A";

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Analytics Overview
            </h2>
          </div>
          <CollapsibleTrigger asChild>
            <button className="p-1.5 hover:bg-gray-100 rounded-md transition-colors">
              <ChevronDown
                className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          </CollapsibleTrigger>
        </div>

        {/* Always-visible summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/15">
                  <ClipboardList className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Referrals (Period)</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analytics?.totalCounts?.referralsThisPeriod ?? analytics?.totalCounts?.totalReferrals ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100">
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Conversion Rate</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analytics?.conversion?.conversionRate ?? 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <Ban className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Denials</p>
                  <p className="text-xl font-bold text-gray-900">
                    {analytics?.denials?.totalDenials ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Top Facility</p>
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[140px]" title={topFacility}>
                    {topFacility}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <CollapsibleContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 px-4 pb-4">
            {/* Top Facilities Bar Chart */}
            <Card className="border shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b py-3 px-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <CardTitle className="text-sm font-semibold text-gray-900">
                    Top 10 Referring Facilities
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {facilityBarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={facilityBarData}
                      layout="vertical"
                      margin={{ left: 80 }}
                    >
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={75}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">No data</p>
                )}
              </CardContent>
            </Card>

            {/* Referral Source Scorecard */}
            <Card className="border shadow-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-b py-3 px-4">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-sm font-semibold text-gray-900">
                    Referral Source Scorecard
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {(analytics?.scorecard?.length ?? 0) > 0 ? (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {analytics?.scorecard?.map((source, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm text-gray-900 truncate max-w-[140px]" title={source.sourceName}>
                            {source.sourceName}
                          </span>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${TIER_CONFIG[source.tier].color}`}
                          >
                            {TIER_CONFIG[source.tier].label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
                          <span>{source.referralCount} refs</span>
                          <span>{source.referralsPerWeek}/wk</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">No data</p>
                )}
              </CardContent>
            </Card>

            {/* Denial Reasons */}
            <Card className="border shadow-sm">
              <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 border-b py-3 px-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-red-600" />
                  <CardTitle className="text-sm font-semibold text-gray-900">
                    Denial Reasons
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {denialReasonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={denialReasonData}
                      layout="vertical"
                      margin={{ left: 80 }}
                    >
                      <XAxis type="number" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={75}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-8">No denials</p>
                )}
              </CardContent>
            </Card>

            {/* Denial Monthly Trend */}
            {denialTrendData.length > 0 && (
              <Card className="border shadow-sm lg:col-span-2 xl:col-span-3">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b py-3 px-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-orange-600" />
                    <CardTitle className="text-sm font-semibold text-gray-900">
                      Monthly Denial Trend
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={denialTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="total"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
