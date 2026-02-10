import type { MileageLogRow } from "@/lib/types";
import { exportToCSV, formatDateTime } from "@/lib/utils";
import { getMileageLogs } from "@/services/mileage/mileage-service";
import { useInfiniteQuery } from "@tanstack/react-query";
import { DollarSign, Download, MapPin, Route } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MasterListFilters } from "../master-list/master-list-filter";
import { ReusableTable } from "../reusable-table/generic-table";
import { Button } from "@dashboard/ui/components/button";
import { Card, CardContent } from "@dashboard/ui/components/card";

export default function MileageReportPage() {
  const [filterMeta, setFilterMeta] = useState({
    mileageDateFrom: null,
    mileageDateTo: null,
    filter: {},
    limit: 20,
  });

  const { data, refetch, isFetchingNextPage, isFetching } = useInfiniteQuery({
    queryKey: ["mileage-report", filterMeta],
    queryFn: () => getMileageLogs(filterMeta),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  });

  const rows = data?.pages.flatMap((p) => p.data) ?? [];

  const totals = useMemo(() => {
    const totalReimbursement = rows.reduce(
      (sum, row) => sum + (row.reimbursementAmount || 0),
      0
    );
    const totalMiles = rows.reduce(
      (sum, row) => sum + (row.totalMiles || 0),
      0
    );
    const totalTrips = rows.length;

    return {
      totalReimbursement,
      totalMiles,
      totalTrips,
    };
  }, [rows]);

  const columns = [
    {
      key: "date",
      header: "Date",
      render: (row: MileageLogRow) => formatDateTime(row.createdAt),
    },
    {
      key: "destination",
      header: "Destination",
      render: (row: MileageLogRow) => row.destination,
    },
    {
      key: "countiesMarketed",
      header: "Counties Marketed",
      render: (row: MileageLogRow) => row.countiesMarketed,
    },
    {
      key: "beginningMileage",
      header: "Beginning Mileage",
      render: (row: MileageLogRow) => row.beginningMileage,
    },
    {
      key: "endingMileage",
      header: "Ending Mileage",
      render: (row: MileageLogRow) => row.endingMileage,
    },
    {
      key: "totalMiles",
      header: "Total Miles",
      render: (row: MileageLogRow) => row.totalMiles,
    },
    {
      key: "rateType",
      header: "Rate Type",
      render: (row: MileageLogRow) => `${row.rateType}`,
    },
    {
      key: "ratePerMile",
      header: "Rate / Mile",
      render: (row: MileageLogRow) => `$${row.ratePerMile.toFixed(2)}`,
    },
    {
      key: "reimbursementAmount",
      header: "Reimbursement",
      render: (row: MileageLogRow) => `$${row.reimbursementAmount.toFixed(2)}`,
    },
  ];

  const handleExportCSV = async () => {
    if (rows.length === 0) {
      toast.error("No mileage logs available to export.");
      return;
    }

    const limit = 100;
    let offset = 0;
    let allData: MileageLogRow[] = [];

    let total = 0;
    let columns: any[] = [];

    do {
      const res = await getMileageLogs({
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
    exportToCSV(allData, columns, `Mileage_Report_${timestamp}`);
    toast.success("CSV download started.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="p-6 sm:p-8">
        <h1 className="text-3xl font-bold text-gray-900">Mileage Report</h1>
        <p className="text-sm text-gray-600 mt-1">
          Track and manage mileage reimbursements
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-emerald-50">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Reimbursement
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  ${totals.totalReimbursement.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-50">
                  <Route className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Miles
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {totals.totalMiles.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-purple-50">
                  <MapPin className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">
                  Total Trips
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {totals.totalTrips}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
        <MasterListFilters
          columns={data?.pages[0].columns ?? []}
          filterMeta={filterMeta}
          refetch={refetch}
          setFilterMeta={setFilterMeta}
          isMileage={true}
        />

        <Card className="border-2">
          <CardContent className="p-6">
            <ReusableTable
              data={rows ?? []}
              columns={columns}
              isLoading={isFetchingNextPage || isFetching}
              emptyMessage="No mileage logs found"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
