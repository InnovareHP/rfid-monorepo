import type { LiaisonAnalyticsCardData } from "@/lib/types";
import { mapAIAnalysisToInsights } from "@/lib/utils";
import { getMarketingList } from "@/services/analytics/analytics-service";
import { useQuery } from "@tanstack/react-query";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  AlertCircle,
  BarChart3,
  Download,
  Filter,
  Loader2,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { getLiaisons } from "@/services/options/options-service";
import { Button } from "@dashboard/ui/components/button";
import { DateRangeFilter } from "@dashboard/ui/components/date-range-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { AIInsights } from "./ai-insights";
import { LiaisonAnalyticsCard } from "./analytics-card";

type Filters = {
  start: Date | null;
  end: Date | null;
  userId: string | null;
};

const MarketingListPage = () => {
  /* UI-only filters */
  const [pendingFilters, setPendingFilters] = useState<Filters>({
    start: null,
    end: null,
    userId: null,
  });

  /* Applied filters (TRIGGERS FETCH) */
  const [filters, setFilters] = useState<Filters>({
    start: null,
    end: null,
    userId: null,
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["marketing-lead-analytics", filters],
    queryFn: () => getMarketingList(filters.start, filters.end, filters.userId),
    staleTime: 1000 * 60 * 5,
  });

  const { data: liaisons = [] } = useQuery({
    queryKey: ["liaisons"],
    queryFn: () => getLiaisons(true),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5,
  });

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    const element = document.getElementById("marketing-analytics-pdf");
    if (!element) {
      toast.error("Unable to export. Please try again.");
      return;
    }

    setIsExporting(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        onclone: (doc) => {
          doc.querySelectorAll("svg").forEach((svg) => svg.remove());
          doc.querySelectorAll("*").forEach((el) => {
            const e = el as HTMLElement;
            e.style.color = "#000000";
            e.style.backgroundColor = "#ffffff";
            e.style.borderColor = "#e5e7eb";
          });
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const timestamp = new Date().toISOString().split("T")[0];
      pdf.save(`marketing-analytics-${timestamp}.pdf`);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = () => {
    setPendingFilters({ start: null, end: null, userId: null });
    setFilters({ start: null, end: null, userId: null });
    toast.info("Filters reset");
  };

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
    toast.success("Filters applied");
  };

  const hasActiveFilters = filters.start || filters.end || filters.userId;

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b-2 border-blue-200 bg-white shadow-md">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6">
            {/* Title Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                    Marketing Analytics
                  </h1>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Track performance, insights, and engagement metrics
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasActiveFilters}
                  className="border-blue-300 hover:bg-blue-50"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button
                  onClick={handleExportPDF}
                  disabled={
                    !filters.start || !filters.end || !data || isExporting
                  }
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export PDF
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Filter className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-base font-bold text-blue-900">
                  Filter Analytics Data
                </h3>
                {hasActiveFilters && (
                  <span className="ml-auto text-xs font-medium text-blue-700 bg-blue-200 px-2 py-1 rounded-full">
                    Filters Active
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Range */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-blue-900">
                    Date Range
                  </label>
                  <DateRangeFilter
                    from={pendingFilters.start}
                    to={pendingFilters.end}
                    onChange={(range: { from: Date | null; to: Date | null }) =>
                      setPendingFilters((prev) => ({
                        ...prev,
                        start: range.from,
                        end: range.to,
                      }))
                    }
                  />
                </div>

                {/* Liaison */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-blue-900">
                    Liaison
                  </label>
                  <Select
                    value={pendingFilters.userId ?? undefined}
                    onValueChange={(value) =>
                      setPendingFilters((prev) => ({
                        ...prev,
                        userId: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[220px] bg-white border-blue-300 hover:border-blue-400 focus:ring-2 focus:ring-blue-500">
                      <SelectValue placeholder="All liaisons" />
                    </SelectTrigger>
                    <SelectContent>
                      {liaisons.length > 0 ? (
                        liaisons.map((liaison) => (
                          <SelectItem key={liaison.id} value={liaison.id}>
                            {liaison.value}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-gray-500">
                          No liaisons available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Apply Button */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-transparent">
                    Action
                  </label>
                  <Button
                    onClick={handleApplyFilters}
                    className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all hover:shadow-md"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 sm:p-8 space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
            <p className="text-blue-700 font-medium">
              Loading analytics data...
            </p>
            <p className="text-sm text-gray-600 mt-1">This may take a moment</p>
          </div>
        ) : isError ? (
          <div className="bg-white border-2 border-red-200 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  Failed to Load Data
                </h3>
                <p className="text-red-700 mt-1">{(error as Error).message}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Please try again or contact support if the problem persists.
                </p>
              </div>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="mt-4 border-red-300 hover:bg-red-50"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        ) : !data || !data.analytics || data.analytics.length === 0 ? (
          <div className="bg-white border-2 border-blue-200 rounded-lg p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                <BarChart3 className="h-10 w-10 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  No Data Available
                </h3>
                <p className="text-gray-600 mt-1">
                  No analytics data found for the selected filters.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Try adjusting your date range or selecting a different
                  liaison.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div id="marketing-analytics-pdf" className="space-y-8">
            <AIInsights insights={mapAIAnalysisToInsights(data?.analysis)} />

            <div className="bg-white rounded-xl border-2 border-gray-300 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">
                  Liaison Performance Overview
                </h2>
                <span className="ml-auto text-sm text-gray-600 bg-blue-100 px-3 py-1 rounded-full">
                  {data.analytics.length}{" "}
                  {data.analytics.length === 1 ? "Liaison" : "Liaisons"}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {data.analytics.map((liaison: LiaisonAnalyticsCardData) => (
                  <LiaisonAnalyticsCard key={liaison.memberId} data={liaison} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketingListPage;
