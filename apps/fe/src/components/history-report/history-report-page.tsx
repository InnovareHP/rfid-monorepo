import { formatCapitalize, formatDateTime } from "@/lib/utils";
import {
  getLeadHistory,
  restoreLeadHistory,
} from "@/services/lead/lead-service";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MasterListFilters } from "../master-list/master-list-filter";
import { ReusableTable } from "../reusable-table/generic-table";
import { Button } from "@dashboard/ui/components/button";
import { RestoreHistoryModal } from "./restore-history-modal";

export default function HistoryReportPage() {
  const queryClient = useQueryClient();
  const [appliedFilterMeta, setAppliedFilterMeta] = useState({
    limit: 20,
    page: 1,
  });
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const {
    data,
    refetch,
    isFetchingNextPage,
    isFetching,
    hasNextPage,
    fetchNextPage,
    } = useInfiniteQuery({
    queryKey: ["history-report", appliedFilterMeta],
    queryFn: () => getLeadHistory(appliedFilterMeta),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  });

  const rows = data?.pages?.flatMap((p) => p.data) ?? [];

  const handleOpenRestoreModal = (historyItem: any) => {
    setSelectedHistoryItem(historyItem);
    setRestoreModalOpen(true);
  };

  const handleRestoreHistory = async (
    leadId: string | undefined,
    historyId: string,
    eventType: string
  ) => {
    setIsRestoring(true);
    try {
      await restoreLeadHistory(leadId, historyId, eventType);
      toast.success("History restored successfully");

      await queryClient.invalidateQueries({
        queryKey: ["history-report", appliedFilterMeta],
      });
      await queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (error) {
      toast.error("Failed to restore history");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <div className="p-8 bg-gray-50 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">History Report</h1>

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
                key: "action",
                header: "Action",
                render: (row: any) => formatCapitalize(row.action),
              },
              {
                key: "column",
                header: "Column Name",
                render: (row: any) => row.column,
              },
              {
                key: "changedBy",
                header: "Changed By",
                render: (row: any) => row.created_by,
              },
              {
                key: "createdAt",
                header: "Created At",
                render: (row: any) => formatDateTime(row.created_at),
              },
              {
                key: "oldValue",
                header: "Old Value",
                render: (row: any) => row.old_value || "-",
              },
              {
                key: "newValue",
                header: "New Value",
                render: (row: any) => row.new_value || "-",
              },
              {
                key: "revert",
                header: "Revert Action",
                render: (row: any) => {
                  const canRestore =
                    row.action.toLowerCase() === "update" ||
                    row.action.toLowerCase() === "delete";

                  if (!canRestore) return "-";

                  return (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenRestoreModal(row)}
                      disabled={isRestoring}
                      className="flex items-center gap-2"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restore
                    </Button>
                  );
                },
              },
            ]}
            isLoading={isFetchingNextPage || isFetching}
            emptyMessage="No history logs found"
          />
        </div>
        <Button
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      </div>

      <RestoreHistoryModal
        open={restoreModalOpen}
        onOpenChange={setRestoreModalOpen}
        historyItem={selectedHistoryItem}
        onConfirm={handleRestoreHistory}
        isRestoring={isRestoring}
      />
    </>
  );
}
