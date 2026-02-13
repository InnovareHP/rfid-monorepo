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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@dashboard/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { getSupportTickets, type SupportTicketListItem } from "@/services/support/support-service";
import { formatRelativeTime } from "./formatRelativeTime";

const PAGE_TITLE = "My requests";
const SEARCH_PLACEHOLDER = "Search requests";
const FILTER_ANY = "Any";
const TAB_MY_REQUESTS = "My requests";
const TAB_CCED = "Requests I'm CC'd on";
const EMPTY_MESSAGE = "No requests found";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN PROGRESS",
  RESOLVED: "SOLVED",
  CLOSED: "CLOSED",
};

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function getStatusBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "OPEN" || status === "IN_PROGRESS") return "default";
  return "secondary";
}

export function RequestsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(FILTER_ANY);
  const [lastActivitySort, setLastActivitySort] = useState<"asc" | "desc">("desc");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support", "tickets"],
    queryFn: getSupportTickets,
  });

  const filtered = useMemo(() => {
    let list = tickets;

    const searchLower = search.trim().toLowerCase();
    if (searchLower) {
      list = list.filter(
        (t) =>
          t.subject?.toLowerCase().includes(searchLower) ||
          t.title?.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== FILTER_ANY) {
      list = list.filter((t) => t.status === statusFilter);
    }

    list = [...list].sort((a, b) => {
      const aTime = new Date(a.updatedAt).getTime();
      const bTime = new Date(b.updatedAt).getTime();
      return lastActivitySort === "desc" ? bTime - aTime : aTime - bTime;
    });

    return list;
  }, [tickets, search, statusFilter, lastActivitySort]);

  const statusOptions = useMemo(() => {
    const set = new Set(tickets.map((t) => t.status));
    return Array.from(set).sort();
  }, [tickets]);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-[1920px] flex-1 space-y-6 px-4 py-6 sm:px-6">
        <h1 className="text-2.5xl font-bold tracking-tight text-foreground sm:text-3xl">
          {PAGE_TITLE}
        </h1>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              type="search"
              placeholder={SEARCH_PLACEHOLDER}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={FILTER_ANY} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ANY}>{FILTER_ANY}</SelectItem>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {getStatusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="my-requests" className="w-full">
          <TabsList className="bg-transparent p-0 h-auto gap-0 border-0 rounded-none">
            <TabsTrigger
              value="my-requests"
              className="rounded-full bg-emerald-100 px-4 py-2 text-emerald-700 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground"
            >
              {TAB_MY_REQUESTS}
            </TabsTrigger>
            <TabsTrigger
              value="cced"
              className="rounded-full px-4 py-2 data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-700 data-[state=inactive]:bg-transparent data-[state=inactive]:text-foreground"
            >
              {TAB_CCED}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-requests" className="mt-4">
            <div className="rounded-lg border border-border bg-card">
              {isLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  Loading…
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  {EMPTY_MESSAGE}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="font-medium">Subject</TableHead>
                      <TableHead className="font-medium w-24">Id</TableHead>
                      <TableHead className="font-medium w-28">Created</TableHead>
                      <TableHead className="font-medium w-32">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-auto gap-1 px-2 py-1 font-medium hover:bg-transparent hover:text-foreground"
                          onClick={() =>
                            setLastActivitySort((s) => (s === "desc" ? "asc" : "desc"))
                          }
                        >
                          Last activity
                          <ChevronDown
                            className={`size-4 transition-transform ${lastActivitySort === "asc" ? "rotate-180" : ""}`}
                          />
                        </Button>
                      </TableHead>
                      <TableHead className="font-medium w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((ticket) => (
                      <RequestRow key={ticket.id} ticket={ticket} />
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cced" className="mt-4">
            <div className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                {EMPTY_MESSAGE}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function RequestRow({ ticket }: { ticket: SupportTicketListItem }) {
  const displayId = `#${ticket.id.slice(-6).toUpperCase()}`;
  const statusVariant = getStatusBadgeVariant(ticket.status);
  const isOpen = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";

  return (
    <TableRow className="border-b border-border">
      <TableCell>
        <Link
          to="/support/$id"
          params={{ id: ticket.id }}
          className="text-primary underline underline-offset-2 hover:no-underline"
        >
          {ticket.subject || ticket.title}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground font-mono text-sm">
        {displayId}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatRelativeTime(ticket.createdAt)}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {formatRelativeTime(ticket.updatedAt)}
      </TableCell>
      <TableCell>
        <Badge
          variant={statusVariant}
          className={
            isOpen
              ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
              : ""
          }
        >
          {getStatusLabel(ticket.status)}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
