import { exportToCsv } from "@/lib/export-csv";
import {
  deleteSupportTicket,
  getSupportTickets,
  updateSupportTicket,
} from "@/services/support/support-service";
import {
  formatCapitalize,
  formatDateTime,
  getStatusLabel,
  Priority,
  statusConfig,
  TicketCategory,
  TicketStatus,
  type TicketRow,
} from "@dashboard/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@dashboard/ui/components/alert-dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@dashboard/ui/components/avatar";
import { Badge } from "@dashboard/ui/components/badge";
import { Button } from "@dashboard/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@dashboard/ui/components/dropdown-menu";
import { Input } from "@dashboard/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dashboard/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@dashboard/ui/components/tabs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUpDown,
  Calendar,
  Download,
  Eye,
  MoreHorizontal,
  RefreshCw,
  Search,
  Ticket,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PriorityBadge, StatusBadge } from "../../Reusable/StatusBadges";
import { ReusableTable } from "../../ReusableTable/ReusableTable";

function ticketAgeHours(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
}

export function SupportDashboardTickets() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<TicketRow | null>(null);
  const [filterMeta, setFilterMeta] = useState<{
    page: number;
    take: number;
    search: string;
    status: string;
    category: string | null;
    priority: string;
  }>({
    page: 1,
    take: 10,
    search: "",
    status: "ALL",
    category: null,
    priority: Priority.MEDIUM,
  });

  const { data: { tickets = [], total = 0 } = {}, isLoading } = useQuery({
    queryKey: ["support-dashboard-tickets", filterMeta],
    queryFn: () => getSupportTickets(filterMeta),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TicketStatus }) =>
      updateSupportTicket(id, { status }),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({
        queryKey: ["support-dashboard-tickets"],
      });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const priorityMutation = useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: string }) =>
      updateSupportTicket(id, { priority }),
    onSuccess: () => {
      toast.success("Priority updated");
      queryClient.invalidateQueries({
        queryKey: ["support-dashboard-tickets"],
      });
    },
    onError: () => toast.error("Failed to update priority"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSupportTicket(id),
    onSuccess: () => {
      toast.success("Ticket deleted");
      setDeleteTarget(null);
      queryClient.invalidateQueries({
        queryKey: ["support-dashboard-tickets"],
      });
    },
    onError: () => toast.error("Failed to delete ticket"),
  });

  const handleView = (row: TicketRow) => {
    navigate({
      to: "/support/tickets/$ticketId" as any,
      params: { ticketId: row.id } as any,
    });
  };

  const handleStatusChange = (row: TicketRow, status: TicketStatus) => {
    statusMutation.mutate({ id: row.id, status });
  };

  const handlePriorityChange = (row: TicketRow, priority: string) => {
    priorityMutation.mutate({ id: row.id, priority });
  };

  const columns = [
    {
      key: "ticketNumber",
      header: "Ticket",
      render: (row: TicketRow) => (
        <Link
          to={"/support/tickets/$ticketNumber" as any}
          params={{ ticketNumber: row.ticketNumber } as any}
          className="flex items-center gap-2"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Ticket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground underline cursor-pointer">
              #{row.ticketNumber}
            </p>
          </div>
        </Link>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      render: (row: TicketRow) => {
        const isTerminal = row.status === "CLOSED" || row.status === "RESOLVED";
        const age = ticketAgeHours(row.createdAt);
        const awaitingReply = !row.hasAgentReply && !isTerminal;
        const isOverdue = awaitingReply && age > 24;
        const isSlaAtRisk = row.hasAgentReply && !isTerminal && age > 72;

        return (
          <div className="flex flex-col gap-1">
            <span className="text-sm text-foreground">{row.subject}</span>
            {isOverdue && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-950/40 dark:text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Overdue — no reply
              </span>
            )}
            {!isOverdue && awaitingReply && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                Awaiting reply
              </span>
            )}
            {isSlaAtRisk && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                SLA at risk
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      render: (row: TicketRow) => (
        <Badge variant="secondary" className="font-normal">
          {formatCapitalize(row.category.toLowerCase())}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: TicketRow) => <StatusBadge status={row.status} />,
    },
    {
      key: "priority",
      header: "Priority",
      render: (row: TicketRow) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: "assignedTo",
      header: "Assigned To",
      render: (row: TicketRow) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.assignedToUser?.user_image} />
            <AvatarFallback className="text-xs">
              <User className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
          <span className="text-sm truncate max-w-[120px]">
            {row.assignedToUser?.user_name ?? "Unassigned"}
          </span>
        </div>
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      render: (row: TicketRow) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.createByUser?.user_image} />
            <AvatarFallback className="text-xs">
              <User className="h-3.5 w-3.5" />
            </AvatarFallback>
          </Avatar>
          <span className="text-sm truncate max-w-[120px]">
            {row.createByUser?.user_name ?? "Unassigned"}
          </span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (row: TicketRow) => (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-sm">{formatDateTime(row.createdAt)}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      render: (row: TicketRow) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleView(row)}>
              <Eye className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {Object.values(TicketStatus).map((s) => (
                  <DropdownMenuItem
                    key={s}
                    disabled={row.status === s}
                    onClick={() => handleStatusChange(row, s)}
                  >
                    <span
                      className={`mr-2 inline-block h-2 w-2 rounded-full ${statusConfig[s]?.dot ?? "bg-gray-400"}`}
                    />
                    {getStatusLabel(s)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Update priority
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {Object.values(Priority).map((p) => (
                  <DropdownMenuItem
                    key={p}
                    disabled={row.priority === p}
                    onClick={() => handlePriorityChange(row, p)}
                  >
                    {formatCapitalize(p.toLowerCase())}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setDeleteTarget(row)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Support Tickets
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all support tickets
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
              <Input
                type="search"
                placeholder="Search by ticket number or title..."
                value={filterMeta.search}
                onChange={(e) =>
                  setFilterMeta({
                    ...filterMeta,
                    search: e.target.value,
                    page: 1,
                  })
                }
                className="pl-9"
              />
            </div>
            <Select
              value={filterMeta.status}
              onValueChange={(value) =>
                setFilterMeta({ ...filterMeta, status: value, page: 1 })
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {Object.values(TicketStatus).map((s) => (
                  <SelectItem key={s} value={s}>
                    {getStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterMeta.category ?? "ALL"}
              onValueChange={(value) =>
                setFilterMeta({
                  ...filterMeta,
                  category: value === "ALL" ? null : value,
                  page: 1,
                })
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {Object.values(TicketCategory).map((c) => (
                  <SelectItem key={c} value={c}>
                    {formatCapitalize(c.toLowerCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterMeta.priority}
              onValueChange={(value) =>
                setFilterMeta({ ...filterMeta, priority: value, page: 1 })
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All priorities</SelectItem>
                {Object.values(Priority).map((p) => (
                  <SelectItem key={p} value={p}>
                    {formatCapitalize(p.toLowerCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            disabled={tickets.length === 0}
            onClick={() =>
              exportToCsv("support-tickets", tickets, [
                { header: "Ticket #", value: (r) => r.ticketNumber },
                { header: "Subject", value: (r) => r.subject },
                { header: "Category", value: (r) => r.category },
                { header: "Status", value: (r) => r.status },
                { header: "Priority", value: (r) => r.priority },
                {
                  header: "Assigned To",
                  value: (r) => r.assignedToUser?.user_name ?? "",
                },
                {
                  header: "Created By",
                  value: (r) => r.createByUser?.user_name ?? "",
                },
                {
                  header: "Created At",
                  value: (r) => new Date(r.createdAt).toLocaleString("en-US"),
                },
              ])
            }
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <Tabs defaultValue="all-tickets" className="w-full">
          <TabsList className="bg-transparent p-0 h-auto gap-1 border-0 rounded-none">
            <TabsTrigger
              value="all-tickets"
              className="rounded-full px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
            >
              All tickets
              {total > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                  {total}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all-tickets" className="mt-4">
            <ReusableTable
              data={tickets}
              columns={columns}
              isLoading={isLoading}
              emptyMessage="No tickets found"
              totalCount={total}
              currentPage={filterMeta.page}
              itemsPerPage={filterMeta.take}
              onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete ticket{" "}
              <strong>#{deleteTarget?.ticketNumber}</strong>. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
