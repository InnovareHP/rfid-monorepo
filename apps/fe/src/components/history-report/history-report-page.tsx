import {
  getLeadHistory,
  restoreLeadHistory,
} from "@/services/lead/lead-service";
import { formatDateTime } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { cn } from "@dashboard/ui/lib/utils";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { RecordAvatar } from "../reusable-table/record-avatar";
import { ReusableTable } from "../reusable-table/generic-table";
import { RestoreHistoryModal } from "./restore-history-modal";

const HISTORY_MODULES = [
  { value: "LEAD", label: "Leads", entity: "Lead", listKey: "leads" },
  {
    value: "REFERRAL",
    label: "Referrals",
    entity: "Referral",
    listKey: "referrals",
  },
  {
    value: "CONTACT",
    label: "Contacts",
    entity: "Contact",
    listKey: "contacts",
  },
  {
    value: "COMPANY",
    label: "Companies",
    entity: "Company",
    listKey: "companies",
  },
] as const;

type HistoryModule = (typeof HISTORY_MODULES)[number];

const ACTION_STYLES: Record<string, string> = {
  update: "bg-blue-100 text-blue-700 border-blue-200",
  delete: "bg-red-100 text-red-700 border-red-200",
  restore: "bg-amber-100 text-amber-700 border-amber-200",
};

const PAGE_SIZE = 20;

function ChangeCell({ row }: { row: any }) {
  const action = row.action?.toLowerCase();

  if (action === "delete") {
    return <span className="text-sm text-red-600">Record deleted</span>;
  }

  return (
    <div className="flex items-center gap-2 min-w-0 max-w-md">
      <span
        className={cn(
          "truncate text-sm",
          row.oldValue
            ? "text-gray-500 line-through decoration-gray-400"
            : "italic text-gray-400"
        )}
        title={row.oldValue || undefined}
      >
        {row.oldValue || "empty"}
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
      <span
        className={cn(
          "truncate text-sm font-medium",
          row.newValue ? "text-gray-900" : "italic text-gray-400"
        )}
        title={row.newValue || undefined}
      >
        {row.newValue || "empty"}
      </span>
    </div>
  );
}

export default function HistoryReportPage() {
  const queryClient = useQueryClient();
  const [module, setModule] = useState<HistoryModule>(HISTORY_MODULES[0]);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const { data, isFetchingNextPage, isFetching, hasNextPage, fetchNextPage } =
    useInfiniteQuery({
      queryKey: ["history-report", module.value],
      queryFn: ({ pageParam }) =>
        getLeadHistory({ page: pageParam, limit: PAGE_SIZE }, module.value),
      getNextPageParam: (lastPage, allPages) => {
        const loaded = allPages.reduce(
          (sum, page) => sum + (page.data?.length ?? 0),
          0
        );
        return loaded < (lastPage.total ?? 0) ? allPages.length + 1 : undefined;
      },
      initialPageParam: 1,
    });

  const rows = data?.pages?.flatMap((p) => p.data) ?? [];
  const total = data?.pages?.[0]?.total ?? 0;

  const handleOpenRestoreModal = (row: any) => {
    setSelectedHistoryItem({
      ...row,
      leadId: row.recordId,
      entityType: module.entity,
    });
    setRestoreModalOpen(true);
  };

  const handleRestoreHistory = async (
    recordId: string | undefined,
    historyId: string,
    eventType: string
  ) => {
    setIsRestoring(true);
    try {
      await restoreLeadHistory(recordId, historyId, eventType, module.value);
      toast.success(`${module.entity} history restored`);

      await queryClient.invalidateQueries({
        queryKey: ["history-report", module.value],
      });
      await queryClient.invalidateQueries({ queryKey: [module.listKey] });
    } catch (error) {
      toast.error("Failed to restore history");
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <div className="p-8 bg-gray-50 min-h-screen space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            History Check
          </h1>
          <p className="text-gray-500 mt-1">
            Every change across your records. Revert an update or bring back a
            deleted record.
          </p>
        </div>

        <Tabs
          value={module.value}
          onValueChange={(value) => {
            const next = HISTORY_MODULES.find((m) => m.value === value);
            if (next) setModule(next);
          }}
        >
          <TabsList>
            {HISTORY_MODULES.map((m) => (
              <TabsTrigger key={m.value} value={m.value}>
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="bg-white border rounded-lg p-4">
          <ReusableTable
            data={rows}
            columns={[
              {
                key: "recordName",
                header: module.entity,
                render: (row: any) => (
                  <div className="flex items-center gap-2 min-w-0">
                    <RecordAvatar name={row.recordName ?? ""} />
                    <span className="truncate font-medium text-gray-900">
                      {row.recordName || "Unknown record"}
                    </span>
                  </div>
                ),
              },
              {
                key: "action",
                header: "Action",
                render: (row: any) => (
                  <Badge
                    variant="outline"
                    className={cn(
                      "capitalize",
                      ACTION_STYLES[row.action?.toLowerCase()] ?? ""
                    )}
                  >
                    {row.action}
                  </Badge>
                ),
              },
              {
                key: "column",
                header: "Field",
                render: (row: any) => row.column || "-",
              },
              {
                key: "change",
                header: "Change",
                render: (row: any) => <ChangeCell row={row} />,
              },
              {
                key: "changedBy",
                header: "By",
                render: (row: any) => row.createdBy || "-",
              },
              {
                key: "createdAt",
                header: "When",
                render: (row: any) => (
                  <span className="whitespace-nowrap text-gray-500">
                    {formatDateTime(row.createdAt)}
                  </span>
                ),
              },
              {
                key: "revert",
                header: "",
                render: (row: any) => {
                  const action = row.action?.toLowerCase();
                  if (action !== "update" && action !== "delete") return null;

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
            isLoading={isFetching && !isFetchingNextPage}
            emptyMessage={`No history for ${module.label.toLowerCase()} yet.`}
          />

          <div className="flex items-center justify-between pt-4">
            <p className="text-sm text-gray-500">
              Showing {rows.length} of {total}
            </p>
            {hasNextPage && (
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            )}
          </div>
        </div>
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
