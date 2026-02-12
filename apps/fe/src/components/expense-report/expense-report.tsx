import {
  exportExpenseLogs,
  getExpenseLogs,
} from "@/services/expense/expense-service";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { ReceiptViewer } from "@dashboard/ui/components/receipt-viewer";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MasterListFilters } from "../master-list/master-list-filter";
import { ReusableTable } from "../reusable-table/generic-table";

export default function ExpenseReportPage() {
  const [appliedFilterMeta, setAppliedFilterMeta] = useState({
    filter: {
      expenseDateFrom: null,
      expenseDateTo: null,
    },
    limit: 20,
  });

  const { data, refetch, isFetchingNextPage, isFetching } = useInfiniteQuery({
    queryKey: ["expense-report", appliedFilterMeta],
    queryFn: () => getExpenseLogs(appliedFilterMeta),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  });

  const rows = data?.pages.flatMap((p) => p.data) ?? [];

  const handleExportCSV = async () => {
    if (rows.length === 0) {
      toast.error("No expense logs available to export.");
      return;
    }

    await exportExpenseLogs(appliedFilterMeta);
  };

  return (
    <div className="p-8 bg-gray-50 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Expense Report</h1>

      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      <MasterListFilters
        columns={data?.pages[0]?.columns ?? []}
        filterMeta={appliedFilterMeta}
        refetch={refetch}
        setFilterMeta={setAppliedFilterMeta}
        isExpense={true}
      />

      <div className="border rounded-lg p-4">
        <ReusableTable
          data={rows ?? []}
          columns={[
            {
              key: "amount",
              header: "Amount",
              render: (row: any) => `$${row.amount}`,
            },

            {
              key: "createdAt",
              header: "Created At",
              render: (row: any) => formatDateTime(row.createdAt),
            },
            {
              key: "description",
              header: "Description",
              render: (row: any) => row.description,
            },
            {
              key: "notes",
              header: "Notes",
              render: (row: any) => row.notes,
            },
            {
              key: "receipt",
              header: "Receipt",
              render: (row: any) => (
                <div className="flex items-center gap-2">
                  <ReceiptViewer url={row.imageUrl} label="View Receipt" />
                </div>
              ),
            },
          ]}
          isLoading={isFetchingNextPage || isFetching}
          emptyMessage="No marketing logs found"
        />
      </div>
    </div>
  );
}
