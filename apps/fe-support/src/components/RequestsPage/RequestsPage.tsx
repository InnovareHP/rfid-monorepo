import { getSupportTickets } from "@/services/support/support-service";
import {
  formatCapitalize,
  formatDateTime,
  getStatusLabel,
  Priority,
  priorityConfig,
  statusConfig,
  TicketStatus,
  type TicketRow,
} from "@dashboard/shared";
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
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  Eye,
  MoreHorizontal,
  Search,
  Ticket,
  User,
} from "lucide-react";
import { useState } from "react";
import { ReusableTable } from "../ReusableTable/ReusableTable";

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] ?? statusConfig.OPEN;
  return (
    <Badge variant="outline" className={config.className}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {getStatusLabel(status)}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] ?? priorityConfig.LOW;
  return (
    <Badge variant="outline" className={config.className}>
      {formatCapitalize(priority.toLowerCase())}
    </Badge>
  );
}

export function RequestsPage() {
  const navigate = useNavigate();
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
    queryKey: ["support", filterMeta],
    queryFn: () => getSupportTickets(filterMeta),
  });

  const handleView = (row: TicketRow) => {
    navigate({
      to: "/$lang/request/$ticketNumber",
      params: { ticketNumber: row.ticketNumber, lang: "en" },
    });
  };

  const columns = [
    {
      key: "ticketNumber",
      header: "Ticket",
      render: (row: TicketRow) => (
        <Link
          to={`/$lang/request/${row.ticketNumber}` as any}
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
      render: (row: TicketRow) => (
        <span className="text-sm text-foreground">{row.subject}</span>
      ),
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
            {/* <DropdownMenuSub>
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
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleDelete(row)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem> */}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-[1920px] flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            My Requests
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track and manage your support tickets
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
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
        </div>

        <Tabs defaultValue="my-requests" className="w-full">
          <TabsList className="bg-transparent p-0 h-auto gap-1 border-0 rounded-none">
            <TabsTrigger
              value="my-requests"
              className="rounded-full px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
            >
              My requests
              {total > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-xs">
                  {total}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="cced"
              className="rounded-full px-4 py-1.5 text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
            >
              CC'd on
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-requests" className="mt-4">
            <ReusableTable
              data={tickets}
              columns={columns}
              isLoading={isLoading}
              emptyMessage="No requests found"
              totalCount={total}
              currentPage={filterMeta.page}
              itemsPerPage={filterMeta.take}
              onPageChange={(page) => setFilterMeta({ ...filterMeta, page })}
            />
          </TabsContent>

          <TabsContent value="cced" className="mt-4">
            <ReusableTable
              data={[]}
              columns={columns}
              emptyMessage="No CC'd requests"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
