import { PageHeader } from "@/components/PageHeader";
import {
  getLeadHistory,
  getLeadHistoryMeta,
  restoreLeadHistory,
} from "@/services/lead/lead-service";
import { formatDateTime } from "@dashboard/shared";
import { Button } from "@dashboard/ui/components/button";
import { DateRangeFilter } from "@dashboard/ui/components/date-range-filter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { Tabs, TabsList, TabsTrigger } from "@dashboard/ui/components/tabs";
import { cn } from "@dashboard/ui/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MoveRight, Pencil, Plus, RefreshCcw, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { KpiStatTile } from "../analytics/charts/kpi-stat-tile";
import {
  ReportTable,
  type ReportColumn,
} from "../reusable-table/report-table";
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

// Shape returned by getAllRecordHistory for each history row.
type HistoryRow = {
  id: string;
  createdAt: string;
  createdBy: string;
  action: string;
  recordId: string;
  recordName?: string;
  oldValue?: string;
  newValue?: string;
  column?: string;
};

type RestoreTarget = HistoryRow & { leadId: string; entityType: string };

type HistoryFilters = {
  from: Date | null;
  to: Date | null;
  userId: string;
  column: string;
};

const EMPTY_FILTERS: HistoryFilters = {
  from: null,
  to: null,
  userId: "all",
  column: "all",
};

const ACTION_CONFIG = {
  create: {
    icon: Plus,
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  update: {
    icon: Pencil,
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  delete: {
    icon: Trash2,
    className: "border-red-200 bg-red-50 text-red-700",
  },
  restore: {
    icon: RotateCcw,
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
} as const;

function ActionBadge({ action }: { action: string }) {
  const config =
    ACTION_CONFIG[action?.toLowerCase() as keyof typeof ACTION_CONFIG] ??
    ACTION_CONFIG.update;
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium capitalize",
        config.className
      )}
    >
      <Icon className="size-3" />
      {action}
    </span>
  );
}

function ChangeCell({ row }: { row: HistoryRow }) {
  return (
    <div className="flex min-w-0 max-w-md items-center gap-3">
      <span
        className={cn(
          "truncate text-sm",
          row.oldValue ? "text-red-600" : "text-gray-400"
        )}
        title={row.oldValue || undefined}
      >
        {row.oldValue || "Empty"}
      </span>
      <MoveRight className="size-4 shrink-0 text-gray-400" />
      <span
        className={cn(
          "truncate text-sm",
          row.newValue ? "text-emerald-600" : "text-gray-400"
        )}
        title={row.newValue || undefined}
      >
        {row.newValue || "Empty"}
      </span>
    </div>
  );
}

export default function HistoryReportPage() {
  const queryClient = useQueryClient();
  const [module, setModule] = useState<HistoryModule>(HISTORY_MODULES[0]);
  const [pendingFilters, setPendingFilters] =
    useState<HistoryFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<HistoryFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<RestoreTarget | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["history-report", module.value, appliedFilters, page, pageSize],
    queryFn: () =>
      getLeadHistory(
        {
          page,
          limit: pageSize,
          dateFrom: appliedFilters.from ?? undefined,
          dateTo: appliedFilters.to ?? undefined,
          userId:
            appliedFilters.userId === "all" ? undefined : appliedFilters.userId,
          column:
            appliedFilters.column === "all" ? undefined : appliedFilters.column,
        },
        module.value
      ),
  });

  // Stats and dropdown options are org-wide, so they refetch only per module.
  const { data: meta, isFetching: isFetchingMeta } = useQuery({
    queryKey: ["history-report-meta", module.value],
    queryFn: () => getLeadHistoryMeta(module.value),
    staleTime: 5 * 60 * 1000,
  });

  const rows: HistoryRow[] = data?.data ?? [];
  const stats = meta?.stats;
  const options = meta?.options ?? { users: [], fields: [] };

  const handleOpenRestoreModal = (row: HistoryRow) => {
    setSelectedHistoryItem({
      ...row,
      leadId: row.recordId,
      entityType: module.entity,
    });
    setRestoreModalOpen(true);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(pendingFilters);
    setPage(1);
    toast.success("Filters applied");
  };

  const handleReset = () => {
    setPendingFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPage(1);
    toast.info("Filters reset");
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
      await queryClient.invalidateQueries({
        queryKey: ["history-report-meta", module.value],
      });
      await queryClient.invalidateQueries({ queryKey: [module.listKey] });
    } catch (error) {
      toast.error("Failed to restore history");
    } finally {
      setIsRestoring(false);
    }
  };

  const columns: ReportColumn<HistoryRow>[] = [
    {
      key: "action",
      header: "Action",
      render: (row) => <ActionBadge action={row.action} />,
    },
    {
      key: "column",
      header: "Field",
      render: (row) => row.column || "-",
    },
    {
      key: "change",
      header: "Change",
      render: (row) => <ChangeCell row={row} />,
    },
    {
      key: "changedBy",
      header: "Changed By",
      render: (row) => row.createdBy || "-",
    },
    {
      key: "createdAt",
      header: "Created At",
      render: (row) => (
        <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span>
      ),
    },
    {
      key: "revert",
      header: "Revert Action",
      render: (row) => {
        const action = row.action?.toLowerCase();
        if (action !== "update" && action !== "delete") return null;

        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenRestoreModal(row)}
            disabled={isRestoring}
            className="h-auto gap-2 px-0 text-primary hover:bg-transparent hover:text-primary/80"
          >
            <RotateCcw className="size-4" />
            Restore
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <div className="page-style">
        <PageHeader
        title="History Check"
        description="Audit every change made to your records - see what changed, who changed it, and undo it in one click."
      />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiStatTile
            label="Total Changes"
            value={(stats?.totalChanges ?? 0).toLocaleString()}
            isLoading={isFetchingMeta}
          />
          <KpiStatTile
            label="Changes This Week"
            value={(stats?.changesThisWeek ?? 0).toLocaleString()}
            isLoading={isFetchingMeta}
          />
          <KpiStatTile
            label="Most Active Editor"
            value={stats?.mostActiveEditor ?? "-"}
            isLoading={isFetchingMeta}
          />
        </div>

        <Tabs
          value={module.value}
          onValueChange={(value) => {
            const next = HISTORY_MODULES.find((m) => m.value === value);
            if (!next) return;
            setModule(next);
            setPage(1);
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

        <div className="flex flex-wrap items-center gap-3">
          <DateRangeFilter
            from={pendingFilters.from}
            to={pendingFilters.to}
            onChange={(range) =>
              setPendingFilters((prev) => ({
                ...prev,
                from: range.from,
                to: range.to,
              }))
            }
          />

          <Select
            value={pendingFilters.userId}
            onValueChange={(value) =>
              setPendingFilters((prev) => ({ ...prev, userId: value }))
            }
          >
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {options.users.map((user: { id: string; name: string }) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={pendingFilters.column}
            onValueChange={(value) =>
              setPendingFilters((prev) => ({ ...prev, column: value }))
            }
          >
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="All Fields" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fields</SelectItem>
              {options.fields.map((field: string) => (
                <SelectItem key={field} value={field}>
                  {field}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => refetch()}
              className="text-muted-foreground"
            >
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>

            <Button
              variant="ghost"
              onClick={handleReset}
              className="text-muted-foreground"
            >
              Reset
            </Button>

            <Button
              onClick={handleApplyFilters}
              className="bg-brand text-white hover:bg-brand/90"
            >
              Apply Filters
            </Button>
          </div>
        </div>

        <ReportTable
          columns={columns}
          rows={rows}
          isLoading={isFetching}
          emptyMessage={`No history for ${module.label.toLowerCase()} yet.`}
          currentPage={page}
          pageSize={pageSize}
          totalCount={data?.total ?? 0}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
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
