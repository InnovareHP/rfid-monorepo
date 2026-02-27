import { format } from "date-fns";
import { useState } from "react";

import { Button } from "@dashboard/ui/components/button";
import { Calendar } from "@dashboard/ui/components/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@dashboard/ui/components/popover";

import {
  Activity,
  ArrowUpRight,
  Building2,
  CalendarIcon,
  Clock,
  CreditCard,
  Globe,
  MapPin,
  TrendingUp,
  UserRound,
} from "lucide-react";

import {
  getAnalytics,
  getAnalyticsSummary,
} from "@/services/analytics/analytics-service";
import type { AnalyticsResponse } from "@dashboard/shared";

import { useQuery } from "@tanstack/react-query";
import * as Recharts from "recharts";
import AiSumary from "./ai-sumary";
import CountyHeatMap from "./county-heat-map";

function DateRangeFilter({
  onChange,
}: {
  onChange: (value: { start: Date | null; end: Date | null }) => void;
}) {
  const [date, setDate] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const handleSelect = (selected: any) => {
    setDate(selected);
    onChange(selected);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-[280px] justify-start text-left font-normal border-2 border-gray-200 hover:border-blue-500 transition-colors"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
          {date.start ? (
            date.end ? (
              <span className="text-gray-900 font-medium">
                {format(date.start, "LLL dd, y")} —{" "}
                {format(date.end, "LLL dd, y")}
              </span>
            ) : (
              <span className="text-gray-900 font-medium">
                {format(date.start, "LLL dd, y")}
              </span>
            )
          ) : (
            <span className="text-gray-500">Select date range</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="range"
          selected={{
            from: date.start ?? undefined,
            to: date.end ?? undefined,
          }}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}

export default function ReferralAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });

  // MAIN ANALYTICS (runs when date range exists)
  const { data: analytics, refetch: refetchAnalytics } = useQuery({
    queryKey: ["analytics", dateRange],
    queryFn: async () => {
      const start = dateRange.start ? dateRange.start.toISOString() : null;
      const end = dateRange.end ? dateRange.end.toISOString() : null;
      return (await getAnalytics(start, end)) as AnalyticsResponse;
    },
  });

  // AI SUMMARY (runs ONLY when analytics is done)
  const { data: analyticsSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["analyticsSummary", analytics?.analytics],
    enabled: !!analytics,

    queryFn: async () => {
      return await getAnalyticsSummary(analytics ?? ({} as AnalyticsResponse));
    },
  });

  const barData =
    analytics?.facilities?.map((f) => ({
      name: f.value ?? "Unknown Facility",
      count: f._count.value,
    })) ?? [];

  const pieData =
    analytics?.payers?.map((p) => ({
      name: p.value ?? "Unknown",
      value: p._count.value,
    })) ?? [];

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  const {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
  } = Recharts;

  return (
    <div className="min-h-full bg-gray-50 p-8">
      <div className=" space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              Referral Intelligence Dashboard
            </h1>
            <p className="text-gray-500 mt-1">
              Track key outreach and referral performance metrics
            </p>
          </div>

          {/* DATE FILTER */}
          <DateRangeFilter
            onChange={(range) => {
              setDateRange(range);
              refetchAnalytics();
            }}
          />
        </div>

        {/* AI SUMMARY CARD */}
        <AiSumary
          isLoadingSummary={isLoadingSummary}
          summary={analyticsSummary}
        />

        {/* ANALYTICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Top Facilities */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-600">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Top 10 Referring Facilities
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData.slice(0, 10)}>
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Clinicians */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-cyan-100/50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-600">
                  <UserRound className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Top 10 Referring Clinicians
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={
                    analytics?.clinicians?.slice(0, 10).map((c) => ({
                      name: c.value ?? "Unknown",
                      count: c._count.value,
                    })) ?? []
                  }
                >
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="#0891b2" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Counties */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-600">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Top 10 Counties Generating Referrals
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={
                    analytics?.counties?.slice(0, 10).map((c) => ({
                      name: c.value ?? "Unknown",
                      count: c._count.value,
                    })) ?? []
                  }
                >
                  <XAxis dataKey="name" hide />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="#16a34a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Referral Source Breakdown */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100/50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-600">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Referral Source Type Breakdown
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" outerRadius={80} label>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-600">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Conversion-to-Admission Rate
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-bold text-emerald-600">
                  {analytics?.conversion?.conversionRate ?? 0}%
                </p>
                <ArrowUpRight className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Converted referrals this period
              </p>
            </CardContent>
          </Card>

          {/* Time to Admission */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-600">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Average Time to Admission
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-5xl font-bold text-amber-600">
                {analytics?.avgTime?.averageDays ?? "0.0"}
              </p>
              <p className="text-sm text-gray-500 mt-3">days on average</p>
            </CardContent>
          </Card>

          {/* Payer Mix */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-600">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Payer Source Mix
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" outerRadius={80} label>
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Discharge */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-rose-50 to-rose-100/50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-600">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Discharge Disposition
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-5xl font-bold text-rose-600">
                {analytics?.discharge?.reduce(
                  (sum, d) => sum + (d.total ?? 0),
                  0
                ) ?? 0}
              </p>
              <p className="text-sm text-gray-500 mt-3">Total discharges</p>
            </CardContent>
          </Card>

          {/* Outreach Impact */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-sky-50 to-sky-100/50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-600">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Outreach Activity Impact
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 leading-relaxed">
                Recent outreach activities correlated with referral spikes.
                Monitor trends to optimize engagement strategies.
              </p>
            </CardContent>
          </Card>

          {/* Emerging Sources */}
          <Card className="border shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="bg-gradient-to-r from-teal-50 to-teal-100/50 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-teal-600">
                  <ArrowUpRight className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Emerging Referral Sources
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 leading-relaxed">
                New or low-frequency facilities beginning to refer. Identify
                opportunities for relationship building.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* COUNTY HEAT MAP */}
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100/50 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-600">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Referral Density by County
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 px-0 pb-0">
            <CountyHeatMap
              counties={
                analytics?.counties.map((c) => ({
                  value: c.value ?? "",
                  _count: { value: c._count.value },
                })) ?? []
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
