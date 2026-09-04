import {
  ExportCsvButton,
  type ExportRange,
} from "@/components/export-csv-button";
import { PageHeader } from "@/components/page-header";
import { downloadCSVBlob } from "@/lib/fe-helpers";
import {
  exportMileageCsv,
  getMileageLogs,
} from "@/services/mileage/mileage-service";
import type { MileageLogRow } from "@dashboard/shared";
import { formatDateTime } from "@dashboard/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KpiStatTile } from "../analytics/charts/kpi-stat-tile";
import { MasterListFilters } from "../master-list/master-list-filter";
import {
  ReportChip,
  ReportTable,
  type ReportColumn,
} from "../reusable-table/report-table";

const columns: ReportColumn<MileageLogRow>[] = [
  {
    key: "date",
    header: "Date",
    render: (row) => formatDateTime(row.createdAt),
  },
  {
    key: "destination",
    header: "Destination",
    render: (row) => row.destination,
  },
  {
    key: "countiesMarketed",
    header: "Counties Marketed",
    render: (row) => (
      <div className="flex flex-wrap gap-2">
        {(row.countiesMarketed ?? "")
          .split(",")
          .map((county) => county.trim())
          .filter(Boolean)
          .map((county) => (
            <ReportChip key={county}>{county}</ReportChip>
          ))}
      </div>
    ),
  },
  {
    key: "beginningMileage",
    header: "Beginning Mileage",
    render: (row) => row.beginningMileage,
  },
  {
    key: "endingMileage",
    header: "Ending Mileage",
    render: (row) => row.endingMileage,
  },
  {
    key: "totalMiles",
    header: "Total Miles",
    render: (row) => row.totalMiles,
  },
  {
    key: "rateType",
    header: "Rate Type",
    render: (row) => <ReportChip>{row.rateType}</ReportChip>,
  },
  {
    key: "ratePerMile",
    header: "Rate / Mile",
    render: (row) => `$${row.ratePerMile.toFixed(2)}`,
  },
  {
    key: "reimbursementAmount",
    header: "Reimbursement",
    render: (row) => `$${row.reimbursementAmount.toFixed(2)}`,
  },
];

export default function MileageReportPage() {
  const [filterMeta, setFilterMeta] = useState({
    filter: { mileageDateFrom: null, mileageDateTo: null },
    limit: 10,
  });
  const [page, setPage] = useState(1);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["mileage-report", filterMeta, page],
    queryFn: () => getMileageLogs({ ...filterMeta, page }),
  });

  const rows: MileageLogRow[] = data?.data ?? [];
  const totals = data?.totals ?? { reimbursement: 0, miles: 0, trips: 0 };

  const handleExportCSV = async (range: ExportRange) => {
    if (rows.length === 0) {
      toast.error("No mileage logs available to export.");
      return;
    }

    try {
      const { blob, filename } = await exportMileageCsv(range);
      downloadCSVBlob(blob, filename);
      toast.success("CSV download started.");
    } catch {
      toast.error("Export failed. Try again.");
    }
  };

  return (
    <div className="page-style">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
        title="Mileage Report"
        description="Track and manage mileage reimbursements."
      />

          <ExportCsvButton
            onExport={handleExportCSV}
            className="bg-brand text-white hover:bg-brand/90"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiStatTile
            label="Total Reimbursement"
            value={`$${totals.reimbursement.toFixed(2)}`}
            isLoading={isFetching}
          />
          <KpiStatTile
            label="Total Miles"
            value={totals.miles.toLocaleString()}
            isLoading={isFetching}
          />
          <KpiStatTile
            label="Total Trips"
            value={totals.trips.toLocaleString()}
            isLoading={isFetching}
          />
        </div>

        <MasterListFilters
          columns={data?.columns ?? []}
          filterMeta={filterMeta}
          refetch={refetch}
          setFilterMeta={setFilterMeta}
          isMileage={true}
        />

        <ReportTable
          columns={columns}
          rows={rows}
          isLoading={isFetching}
          emptyMessage="No mileage logs found"
          currentPage={page}
          pageSize={filterMeta.limit}
          totalCount={data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setFilterMeta((prev) => ({ ...prev, limit: size }));
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
