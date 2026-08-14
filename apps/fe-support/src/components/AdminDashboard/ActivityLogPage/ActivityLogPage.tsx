import { exportToCsv } from "@/lib/export-csv";
import { ROLES } from "@/lib/contant";
import {
  getActivityLog,
  listUsers,
  type ActivityLogEntry,
} from "@/services/admin/admin-service";
import { formatDateTime } from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ClipboardList, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ReusableTable } from "../../ReusableTable/ReusableTable";
import { ACTION_META, ACTION_OPTIONS } from "./activity-log-actions";

// Matches ACTIVITY_LOG_MAX_TAKE in the API, which caps a single page.
const EXPORT_LIMIT = 5000;

export function ActivityLogPage() {
  const [filterMeta, setFilterMeta] = useState({
    page: 1,
    take: 20,
    actionFilter: "ALL",
    adminFilter: "ALL",
    startDate: "",
    endDate: "",
  });

  const activeFilters = {
    ...(filterMeta.actionFilter !== "ALL"
      ? { actionFilter: filterMeta.actionFilter }
      : {}),
    ...(filterMeta.adminFilter !== "ALL"
      ? { adminId: filterMeta.adminFilter }
      : {}),
    ...(filterMeta.startDate ? { startDate: filterMeta.startDate } : {}),
    ...(filterMeta.endDate ? { endDate: filterMeta.endDate } : {}),
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-activity-log", filterMeta],
    queryFn: () =>
      getActivityLog({
        page: filterMeta.page,
        take: filterMeta.take,
        ...activeFilters,
      }),
  });

  const { data: admins } = useQuery({
    queryKey: ["admin-users", "actors"],
    queryFn: () => listUsers({ roleFilter: ROLES.SUPER_ADMIN, take: 100 }),
  });

  const exportMutation = useMutation({
    mutationFn: () => getActivityLog({ page: 1, take: EXPORT_LIMIT, ...activeFilters }),
    onSuccess: (result) => {
      exportToCsv("admin-activity-log", result.logs, [
        { header: "Date", value: (row) => formatDateTime(row.createdAt) },
        { header: "Admin", value: (row) => row.admin.name },
        {
          header: "Action",
          value: (row) => ACTION_META[row.action]?.label ?? row.action,
        },
        { header: "Target user", value: (row) => row.targetUser?.name ?? "" },
        { header: "Target organization", value: (row) => row.targetOrgId ?? "" },
        { header: "Details", value: (row) => row.details ?? "" },
        { header: "IP address", value: (row) => row.ipAddress ?? "" },
      ]);

      if (result.total > result.logs.length) {
        toast.warning(
          `Exported the ${result.logs.length} most recent of ${result.total} matching entries. Narrow the date range for the rest.`
        );
      }
    },
    onError: () => toast.error("Failed to export the activity log"),
  });

  const columns = [
    {
      key: "createdAt",
      header: "Date",
      render: (row: ActivityLogEntry) => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {formatDateTime(row.createdAt)}
        </span>
      ),
    },
    {
      key: "admin",
      header: "Admin",
      render: (row: ActivityLogEntry) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={row.admin.image ?? undefined} />
            <AvatarFallback className="text-xs">
              {row.admin.name?.charAt(0) ?? "A"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{row.admin.name}</span>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row: ActivityLogEntry) => (
        <Badge variant={ACTION_META[row.action]?.variant ?? "outline"}>
          {ACTION_META[row.action]?.label ?? row.action}
        </Badge>
      ),
    },
    {
      key: "target",
      header: "Target",
      render: (row: ActivityLogEntry) =>
        row.targetUser ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={row.targetUser.image ?? undefined} />
              <AvatarFallback className="text-xs">
                {row.targetUser.name?.charAt(0) ?? "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{row.targetUser.name}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">&mdash;</span>
        ),
    },
    {
      key: "details",
      header: "Details",
      render: (row: ActivityLogEntry) => (
        <span className="text-sm text-muted-foreground">
          {row.details ?? "—"}
        </span>
      ),
    },
    {
      key: "ipAddress",
      header: "IP",
      render: (row: ActivityLogEntry) => (
        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
          {row.ipAddress ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
            <ClipboardList className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="page-title text-2xl font-bold tracking-tight sm:text-3xl">
              Activity Log
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Audit trail of all admin actions
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || !data?.total}
          >
            <Download className="h-4 w-4" />
            {exportMutation.isPending ? "Exporting..." : "Export CSV"}
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
          <Select
            value={filterMeta.actionFilter}
            onValueChange={(value) =>
              setFilterMeta({ ...filterMeta, actionFilter: value, page: 1 })
            }
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filterMeta.adminFilter}
            onValueChange={(value) =>
              setFilterMeta({ ...filterMeta, adminFilter: value, page: 1 })
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All admins" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All admins</SelectItem>
              {(admins?.users ?? []).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={filterMeta.startDate}
            onChange={(e) =>
              setFilterMeta({
                ...filterMeta,
                startDate: e.target.value,
                page: 1,
              })
            }
            className="w-[160px]"
            placeholder="Start date"
          />
          <Input
            type="date"
            value={filterMeta.endDate}
            onChange={(e) =>
              setFilterMeta({
                ...filterMeta,
                endDate: e.target.value,
                page: 1,
              })
            }
            className="w-[160px]"
            placeholder="End date"
          />
        </div>

        <ReusableTable
          data={data?.logs ?? []}
          columns={columns}
          isLoading={isLoading}
          emptyMessage="No activity log entries"
          totalCount={data?.total ?? 0}
          currentPage={filterMeta.page}
          itemsPerPage={filterMeta.take}
          onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
        />
      </div>
    </div>
  );
}
