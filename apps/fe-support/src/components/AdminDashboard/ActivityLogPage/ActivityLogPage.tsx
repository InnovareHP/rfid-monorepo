import {
  getActivityLog,
  type ActivityLogEntry,
} from "@/services/admin/admin-service";
import { formatDateTime } from "@dashboard/shared";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Badge } from "@dashboard/ui/components/badge";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { ReusableTable } from "../../ReusableTable/ReusableTable";

const ACTION_OPTIONS = [
  { label: "All actions", value: "ALL" },
  { label: "Ban User", value: "BAN_USER" },
  { label: "Unban User", value: "UNBAN_USER" },
  { label: "Set Role", value: "SET_ROLE" },
  { label: "Remove User", value: "REMOVE_USER" },
  { label: "Impersonate User", value: "IMPERSONATE_USER" },
  { label: "Stop Impersonate", value: "STOP_IMPERSONATE" },
] as const;

const ACTION_LABELS: Record<string, string> = {
  BAN_USER: "Ban User",
  UNBAN_USER: "Unban User",
  SET_ROLE: "Set Role",
  REMOVE_USER: "Remove User",
  IMPERSONATE_USER: "Impersonate",
  STOP_IMPERSONATE: "Stop Impersonate",
};

const ACTION_COLORS: Record<string, string> = {
  BAN_USER: "bg-red-50 text-red-700 border-red-200",
  UNBAN_USER: "bg-green-50 text-green-700 border-green-200",
  SET_ROLE: "bg-blue-50 text-blue-700 border-blue-200",
  REMOVE_USER: "bg-red-50 text-red-800 border-red-300",
  IMPERSONATE_USER: "bg-yellow-50 text-yellow-700 border-yellow-200",
  STOP_IMPERSONATE: "bg-gray-50 text-gray-700 border-gray-200",
};

export function ActivityLogPage() {
  const [filterMeta, setFilterMeta] = useState({
    page: 1,
    take: 20,
    actionFilter: "ALL",
    startDate: "",
    endDate: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-activity-log", filterMeta],
    queryFn: () =>
      getActivityLog({
        page: filterMeta.page,
        take: filterMeta.take,
        ...(filterMeta.actionFilter !== "ALL"
          ? { actionFilter: filterMeta.actionFilter }
          : {}),
        ...(filterMeta.startDate ? { startDate: filterMeta.startDate } : {}),
        ...(filterMeta.endDate ? { endDate: filterMeta.endDate } : {}),
      }),
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
        <Badge variant="outline" className={ACTION_COLORS[row.action] ?? ""}>
          {ACTION_LABELS[row.action] ?? row.action}
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
          {row.details ?? "\u2014"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <ClipboardList className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Activity Log
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Audit trail of all admin actions
            </p>
          </div>
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
