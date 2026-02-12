import { getMarketLogs } from "@/services/market/market-service";
import type { MarketLogRow } from "@dashboard/shared";
import { formatDateTime } from "@dashboard/shared";
import { exportToCSV } from "@/lib/fe-helpers";
import { Button } from "@dashboard/ui/components/button";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MasterListFilters } from "../master-list/master-list-filter";
import { ReusableTable } from "../reusable-table/generic-table";

export default function MarketingReportPage() {
  const [filterMeta, setFilterMeta] = useState({
    filter: { marketingDateFrom: null, marketingDateTo: null },
    limit: 20,
  });

  const { data, refetch, isFetchingNextPage, isFetching } = useInfiniteQuery({
    queryKey: ["marketing-report", filterMeta],
    queryFn: () => getMarketLogs(filterMeta),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  });

  const rows = data?.pages.flatMap((p) => p.data) ?? [];

  const columns = [
    {
      key: "date",
      header: "Date",
      render: (row: MarketLogRow) => formatDateTime(row.createdAt),
    },
    {
      key: "facility",
      header: "Facility",
      render: (row: MarketLogRow) => row.facility || "N/A",
    },
    {
      key: "touchpoint",
      header: "Touchpoint",
      render: (row: MarketLogRow) =>
        Array.isArray(row.touchpoint)
          ? row.touchpoint.join(", ").replace(/_/g, " ")
          : row.touchpoint || "N/A",
    },
    {
      key: "talkedTo",
      header: "Talked To",
      render: (row: MarketLogRow) => row.talkedTo || "N/A",
    },
    {
      key: "notes",
      header: "Notes",
      render: (row: MarketLogRow) => row.notes || "N/A",
    },
    {
      key: "Reason For Visit",
      header: "Reason For Visit",
      render: (row: MarketLogRow) => row.reasonForVisit || "N/A",
    },
  ];

  const handleExportCSV = async () => {
    if (rows.length === 0) {
      toast.error("No mileage logs available to export.");
      return;
    }

    const limit = 100;
    let offset = 0;
    let allData: MarketLogRow[] = [];

    let total = 0;
    let columns: any[] = [];

    do {
      const res = await getMarketLogs({
        ...filterMeta,
        limit,
        page: offset,
      });

      if (offset === 1) {
        total = res.pagination.count;
        columns = res.columns;
      }

      columns = [...columns];
      allData = [...allData, ...res.data];
      offset += res.data.length;
    } while (offset < total);

    const timestamp = new Date().toISOString().split("T")[0];
    exportToCSV(allData, columns, `Marketing_Report_${timestamp}`);
    toast.success("CSV download started.");
  };

  return (
    <div className="p-8 bg-gray-50 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Marketing Report</h1>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
      <MasterListFilters
        columns={data?.pages[0]?.columns ?? []}
        filterMeta={filterMeta}
        refetch={refetch}
        setFilterMeta={setFilterMeta}
        isMarketing={true}
      />

      <div className="border rounded-lg p-4">
        <ReusableTable
          data={rows ?? []}
          columns={columns}
          isLoading={isFetchingNextPage || isFetching}
          emptyMessage="No marketing logs found"
        />
      </div>
    </div>
  );
}
