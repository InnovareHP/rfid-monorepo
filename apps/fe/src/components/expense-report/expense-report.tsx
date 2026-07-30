import {
  exportExpenseLogs,
  getExpenseLogs,
} from "@/services/expense/expense-service";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { ReceiptViewer } from "@dashboard/ui/components/receipt-viewer";
import { useQuery } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { KpiStatTile } from "../analytics/charts/kpi-stat-tile";
import { MasterListFilters } from "../master-list/master-list-filter";
import { ReportTable, type ReportColumn } from "../reusable-table/report-table";

type ExpenseReportRow = {
  id: string;
  createdAt: string;
  amount: number;
  description: string;
  notes: string;
  imageUrl: string;
  liaisonName?: string;
};

const columns: ReportColumn<ExpenseReportRow>[] = [
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
    key: "amount",
    header: "Amount",
    render: (row) => `$${row.amount}`,
  },
  {
    key: "description",
    header: "Description",
    render: (row) => row.description || "N/A",
  },
  {
    key: "notes",
    header: "Notes",
    render: (row) => row.notes || "N/A",
  },
  {
    key: "receipt",
    header: "Receipt",
    render: (row) =>
      row.imageUrl ? (
        <ReceiptViewer url={row.imageUrl} label="View Receipt" />
      ) : (
        "N/A"
      ),
  },
];

export default function ExpenseReportPage() {
  const [filterMeta, setFilterMeta] = useState({
    filter: { expenseDateFrom: null, expenseDateTo: null },
    limit: 10,
  });
  const [page, setPage] = useState(1);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["expense-report", filterMeta, page],
    queryFn: () => getExpenseLogs({ ...filterMeta, page }),
  });

  const rows: ExpenseReportRow[] = data?.data ?? [];
  const totals = data?.totals ?? {
    amount: 0,
    missingReceipts: 0,
    averageAmount: 0,
  };

  const handleExport = async () => {
    if (rows.length === 0) {
      toast.error("No expense logs available to export.");
      return;
    }

    await exportExpenseLogs(filterMeta);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title text-3xl font-bold tracking-tight sm:text-4xl">
              Expense Report
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track and manage business expenses and receipts.
            </p>
          </div>

          <Button
            onClick={handleExport}
            className="bg-brand text-white hover:bg-brand/90"
          >
            <FileDown className="mr-1 h-4 w-4" />
            Export PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiStatTile
            label="Total Expenses"
            value={`$${totals.amount.toFixed(2)}`}
            isLoading={isFetching}
          />
          <KpiStatTile
            label="Missing Receipts"
            value={totals.missingReceipts.toLocaleString()}
            isLoading={isFetching}
          />
          <KpiStatTile
            label="Average Expense"
            value={`$${totals.averageAmount.toFixed(2)}`}
            isLoading={isFetching}
          />
        </div>

        <MasterListFilters
          columns={data?.columns ?? []}
          filterMeta={filterMeta}
          refetch={refetch}
          setFilterMeta={setFilterMeta}
          isExpense={true}
        />

        <ReportTable
          columns={columns}
          rows={rows}
          isLoading={isFetching}
          emptyMessage="No expense logs found"
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
