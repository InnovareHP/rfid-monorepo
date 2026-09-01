import {
  ExportCsvButton,
  type ExportRange,
} from "@/components/export-csv-button";
import { PageHeader } from "@/components/page-header";
import { exportToCSV } from "@/lib/fe-helpers";
import { getMarketLogs } from "@/services/market/market-service";
import type {
  MarketingFacilityBreakdown,
  MarketingReportRow,
  MarketingTouchpointBreakdown,
} from "@dashboard/shared";
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

// EMAIL_BLAST is a server-only touchpoint (bulk sends), labeled distinctly
// from a liaison's individually-logged EMAIL touchpoint.
const TOUCHPOINT_LABELS: Record<string, string> = {
  IN_PERSON_MEETING: "In Person",
  LINKED_IN: "LinkedIn",
  FACEBOOK: "Facebook",
  TEXT: "Text",
  EMAIL: "Email",
  EMAIL_BLAST: "Email (Blast)",
  PHONE: "Phone",
  OTHER: "Other",
};

const columns: ReportColumn<MarketingReportRow>[] = [
  {
    key: "date",
    header: "Date",
    render: (row) => formatDateTime(row.createdAt),
  },
  {
    key: "liaison",
    header: "Liaison",
    render: (row) => row.liaisonName || "N/A",
  },
  {
    key: "facility",
    header: "Facility",
    render: (row) => row.facility || "N/A",
  },
  {
    key: "touchpoint",
    header: "Touchpoint",
    render: (row) => (
      <div className="flex flex-wrap gap-2">
        {(row.touchpoints ?? []).map((touchpoint) => (
          <ReportChip key={touchpoint}>
            {TOUCHPOINT_LABELS[touchpoint] ?? touchpoint.replace(/_/g, " ")}
          </ReportChip>
        ))}
      </div>
    ),
  },
  {
    key: "talkedTo",
    header: "Talked To",
    render: (row) => row.talkedTo || "N/A",
  },
  {
    key: "notes",
    header: "Notes",
    render: (row) => row.notes || "N/A",
  },
  {
    key: "reasonForVisit",
    header: "Reason for Visit",
    render: (row) => row.reasonForVisit || "N/A",
  },
];

const facilityColumns: ReportColumn<MarketingFacilityBreakdown>[] = [
  {
    key: "facility",
    header: "Facility",
    render: (row) => row.facility || "N/A",
  },
  { key: "outreach", header: "Outreach", render: (row) => row.outreach },
  { key: "referrals", header: "Referrals", render: (row) => row.referrals },
  {
    key: "admissions",
    header: "Admissions",
    render: (row) => row.admissions ?? 0,
  },
  {
    key: "conversionRate",
    header: "Conversion Rate",
    render: (row) => `${row.conversionRate}%`,
  },
];

const touchpointColumns: ReportColumn<MarketingTouchpointBreakdown>[] = [
  {
    key: "touchpoint",
    header: "Touchpoint",
    render: (row) => TOUCHPOINT_LABELS[row.touchpoint] ?? row.touchpoint,
  },
  { key: "count", header: "Count", render: (row) => row.count },
];

export default function MarketingReportPage() {
  const [filterMeta, setFilterMeta] = useState({
    filter: { marketingDateFrom: null, marketingDateTo: null },
    limit: 10,
  });
  const [page, setPage] = useState(1);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["marketing-report", filterMeta, page],
    queryFn: () => getMarketLogs({ ...filterMeta, page }),
  });

  const rows: MarketingReportRow[] = data?.data ?? [];
  const totals = data?.totals ?? {
    outreach: 0,
    referrals: 0,
    admissions: 0,
    conversionRate: 0,
    admissionRate: 0,
  };
  const facilityBreakdown = data?.facilityBreakdown ?? [];
  const touchpointBreakdown = data?.touchpointBreakdown ?? [];

  const handleExportCSV = async (range: ExportRange) => {
    if (rows.length === 0) {
      toast.error("No marketing logs available to export.");
      return;
    }

    const limit = 100;
    let exportPage = 1;
    let total = 0;
    let allData: MarketingReportRow[] = [];

    do {
      const res = await getMarketLogs({
        ...filterMeta,
        filter: {
          ...filterMeta.filter,
          ...(range.from && { marketingDateFrom: range.from }),
          ...(range.to && { marketingDateTo: range.to }),
        },
        limit,
        page: exportPage,
      });
      total = res.total ?? 0;
      allData = [...allData, ...res.data];
      exportPage += 1;
    } while (allData.length < total);

    const exportColumns = [
      { name: "Date" },
      { name: "Liaison" },
      { name: "Facility" },
      { name: "Touchpoints" },
      { name: "Talked To" },
      { name: "Reason For Visit" },
      { name: "Notes" },
    ];
    const exportRows = allData.map((row) => ({
      Date: formatDateTime(row.createdAt),
      Liaison: row.liaisonName ?? "",
      Facility: row.facility ?? "",
      Touchpoints: (row.touchpoints ?? []).join(", ").replace(/_/g, " "),
      "Talked To": row.talkedTo ?? "",
      "Reason For Visit": row.reasonForVisit ?? "",
      Notes: row.notes ?? "",
    }));

    const timestamp = new Date().toISOString().split("T")[0];
    exportToCSV(
      exportRows,
      exportColumns,
      `Marketing_Report_${timestamp}`,
      [],
      true
    );
    toast.success("CSV download started.");
  };

  return (
    <div className="page-style">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
        title="Marketing Report"
        description="Track outreach activities and referral generation efforts."
      />

          <ExportCsvButton
            onExport={handleExportCSV}
            className="bg-brand text-white hover:bg-brand/90"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiStatTile
            label="Total Outreach"
            value={totals.outreach.toLocaleString()}
            isLoading={isFetching}
          />
          <KpiStatTile
            label="Total Referrals Generated"
            value={totals.referrals.toLocaleString()}
            isLoading={isFetching}
          />
          <KpiStatTile
            label="Total Admissions"
            value={(totals.admissions ?? 0).toLocaleString()}
            isLoading={isFetching}
          />
          <KpiStatTile
            label="Conversion Rate"
            value={`${totals.conversionRate}%`}
            isLoading={isFetching}
          />
        </div>

        <MasterListFilters
          columns={data?.columns ?? []}
          filterMeta={filterMeta}
          refetch={refetch}
          setFilterMeta={setFilterMeta}
          isMarketing={true}
        />

        <ReportTable
          columns={columns}
          rows={rows}
          isLoading={isFetching}
          emptyMessage="No marketing logs found"
          currentPage={page}
          pageSize={filterMeta.limit}
          totalCount={data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setFilterMeta((prev) => ({ ...prev, limit: size }));
            setPage(1);
          }}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-base font-medium text-foreground">
              Facility Breakdown
            </h3>
            <ReportTable
              columns={facilityColumns}
              rows={facilityBreakdown}
              isLoading={isFetching}
              emptyMessage="No facility activity found"
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-medium text-foreground">
              Touchpoint Breakdown
            </h3>
            <ReportTable
              columns={touchpointColumns}
              rows={touchpointBreakdown}
              isLoading={isFetching}
              emptyMessage="No touchpoint activity found"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
