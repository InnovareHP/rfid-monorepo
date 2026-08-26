import {
  listDemoRequests,
  updateDemoRequest,
  type DemoRequest,
} from "@/services/admin/demo-service";
import {
  DEMO_REQUEST_STATUS_LABELS,
  formatDateTime,
  type DemoRequestStatus,
} from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ReusableTable } from "../../ReusableTable/ReusableTable";
import { DemoHostsCard } from "./DemoHostsCard";
import {
  OUTCOME_OPTIONS,
  STATUS_FILTER_OPTIONS,
  STATUS_VARIANT,
} from "./demo-status-meta";

const PAGE_SIZE = 20;

export function DemoRequestsPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    // Keeps the current rows on screen while the next page or filter loads,
    // instead of blanking the table to a spinner on every keystroke.
    placeholderData: keepPreviousData,
    queryKey: ["demo-requests", page, status, search],
    queryFn: () =>
      listDemoRequests({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        ...(status !== "ALL" ? { status: status as DemoRequestStatus } : {}),
        ...(search ? { search } : {}),
      }),
  });

  const setOutcome = useMutation({
    mutationFn: ({ id, next }: { id: string; next: DemoRequestStatus }) =>
      updateDemoRequest(id, { status: next }),
    onSuccess: async () => {
      toast.success("Outcome saved");
      await queryClient.invalidateQueries({ queryKey: ["demo-requests"] });
    },
    onError: () => toast.error("Could not save the outcome"),
  });

  const columns = [
    {
      key: "name",
      header: "Prospect",
      render: (row: DemoRequest) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      render: (row: DemoRequest) => (
        <div className="min-w-0">
          <p className="truncate">{row.company ?? "—"}</p>
          {row.teamSize && (
            <p className="text-xs text-muted-foreground">
              {row.teamSize} people
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: DemoRequest) => (
        <Badge variant={STATUS_VARIANT[row.status]}>
          {DEMO_REQUEST_STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      key: "scheduledAt",
      header: "Scheduled",
      render: (row: DemoRequest) =>
        row.scheduledAt ? (
          <span className="whitespace-nowrap">
            {formatDateTime(row.scheduledAt)}
          </span>
        ) : (
          // The whole point of capturing before scheduling: this row is a lead
          // that walked away from the calendar.
          <span className="text-xs text-muted-foreground">Not booked</span>
        ),
    },
    {
      key: "assignedHostName",
      header: "Host",
      render: (row: DemoRequest) => row.assignedHostName ?? "—",
    },
    {
      key: "source",
      header: "Source",
      render: (row: DemoRequest) => (
        <div className="min-w-0 text-xs text-muted-foreground">
          <p className="truncate">{row.source ?? "—"}</p>
          {row.utmCampaign && <p className="truncate">{row.utmCampaign}</p>}
        </div>
      ),
    },
    {
      key: "outcome",
      header: "Outcome",
      render: (row: DemoRequest) => (
        <Select
          value=""
          disabled={setOutcome.isPending}
          onValueChange={(next) =>
            setOutcome.mutate({ id: row.id, next: next as DemoRequestStatus })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Set outcome" />
          </SelectTrigger>
          <SelectContent>
            {OUTCOME_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-10">
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Demo requests</h1>
          <p className="text-sm text-muted-foreground">
            Every request from the marketing site, booked or not.
          </p>
        </div>
      </div>

      <DemoHostsCard />

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search name, email or company"
          className="max-w-xs"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
        />

        <Select
          value={status}
          onValueChange={(next) => {
            setPage(1);
            setStatus(next);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ReusableTable
        data={data?.data ?? []}
        columns={columns}
        currentPage={page}
        itemsPerPage={PAGE_SIZE}
        totalCount={data?.total}
        onPageChange={setPage}
        isLoading={isLoading}
        emptyMessage="No demo requests yet"
      />
    </div>
  );
}
