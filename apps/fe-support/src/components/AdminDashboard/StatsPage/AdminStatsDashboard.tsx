import { listUsers } from "@/services/admin/admin-service";
import { getTicketStats } from "@/services/support/support-service";
import type { TicketStats } from "@dashboard/shared";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@dashboard/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  RefreshCw,
  Shield,
  ShieldAlert,
  Ticket,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  bg,
  loading,
}: {
  label: string;
  value: number | string | null;
  icon: React.ElementType;
  iconColor: string;
  bg: string;
  loading: boolean;
}) {
  return (
    <Card className="border border-border shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}
        >
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-4">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-3xl font-bold text-foreground">{value ?? "—"}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TicketStatsSection({
  stats,
  loading,
}: {
  stats?: TicketStats;
  loading: boolean;
}) {
  const total = stats
    ? stats.open + stats.inProgress + stats.resolved + stats.closed
    : null;

  const cards = [
    {
      label: "Total Tickets",
      value: total,
      icon: Ticket,
      iconColor: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Open",
      value: stats?.open ?? null,
      icon: CircleDot,
      iconColor: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "In Progress",
      value: stats?.inProgress ?? null,
      icon: RefreshCw,
      iconColor: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    {
      label: "Resolved",
      value: stats?.resolved ?? null,
      icon: CheckCircle2,
      iconColor: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Closed",
      value: stats?.closed ?? null,
      icon: XCircle,
      iconColor: "text-gray-500",
      bg: "bg-gray-100",
    },
  ];

  return (
    <Card className="border-2 border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Ticket className="h-5 w-5 text-blue-600" />
          Tickets
        </CardTitle>
        <CardDescription>
          Support ticket counts across the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {cards.map((c) => (
            <StatCard key={c.label} {...c} loading={loading} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UserStatsSection({
  totalUsers,
  bannedUsers,
  loading,
}: {
  totalUsers: number | null;
  bannedUsers: number | null;
  loading: boolean;
}) {
  const activeUsers =
    totalUsers !== null && bannedUsers !== null
      ? totalUsers - bannedUsers
      : null;

  const rows = [
    {
      label: "Total Users",
      value: totalUsers,
      icon: Users,
      iconColor: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Active Users",
      value: activeUsers,
      icon: UserCheck,
      iconColor: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Banned Users",
      value: bannedUsers,
      icon: ShieldAlert,
      iconColor: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <Card className="border-2 border-gray-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Users className="h-5 w-5 text-blue-600" />
          Users
        </CardTitle>
        <CardDescription>User account status breakdown</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-gray-200 bg-blue-50/50 hover:bg-blue-50/50">
              <TableHead className="font-semibold text-blue-900">
                Metric
              </TableHead>
              <TableHead className="font-semibold text-blue-900 text-right">
                Count
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow
                key={row.label}
                className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
              >
                <TableCell className="font-medium text-gray-900">
                  <span className="flex items-center gap-2">
                    <row.icon className={`h-4 w-4 ${row.iconColor}`} />
                    {row.label}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {loading ? (
                    <Skeleton className="ml-auto h-5 w-12" />
                  ) : (
                    (row.value?.toLocaleString() ?? "—")
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function QuickLinkCard({
  to,
  icon: Icon,
  title,
  description,
  accent,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <Link to={to as any}>
      <Card className="cursor-pointer border border-border transition-colors hover:border-blue-300 hover:bg-muted/30">
        <CardContent className="flex items-start gap-4 p-5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}
          >
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function AdminStatsDashboard() {
  const { data: ticketStats, isLoading: ticketsLoading } =
    useQuery<TicketStats>({
      queryKey: ["admin-ticket-stats"],
      queryFn: getTicketStats,
      refetchInterval: 60_000,
    });

  const { data: allUsersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users-stats"],
    queryFn: () =>
      listUsers({
        page: 1,
        take: 1,
        search: "",
        roleFilter: "ALL",
        sortBy: "createdAt",
        order: "desc",
      }),
    refetchInterval: 60_000,
  });

  const { data: bannedUsersData, isLoading: bannedLoading } = useQuery({
    queryKey: ["admin-users-banned-count"],
    queryFn: () =>
      listUsers({
        page: 1,
        take: 1,
        search: "",
        roleFilter: "ALL",
        sortBy: "createdAt",
        order: "desc",
      }),
    refetchInterval: 60_000,
  });

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-gray-50 via-blue-50/20 to-gray-50">
      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">
                Platform overview — tickets and user stats
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <TicketStatsSection stats={ticketStats} loading={ticketsLoading} />
          <UserStatsSection
            totalUsers={allUsersData?.total ?? null}
            bannedUsers={bannedUsersData?.total ?? null}
            loading={usersLoading || bannedLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLinkCard
            to="/admin/users"
            icon={Users}
            title="User Management"
            description="View, search, and manage platform users"
            accent="bg-blue-50"
          />
          <QuickLinkCard
            to="/admin/organizations"
            icon={Building2}
            title="Organizations"
            description="Browse all organizations, members, and subscriptions"
            accent="bg-purple-50"
          />
          <QuickLinkCard
            to="/admin/activity-log"
            icon={ClipboardList}
            title="Activity Log"
            description="Audit trail of admin actions — bans, role changes, and more"
            accent="bg-orange-50"
          />
          <QuickLinkCard
            to="/support/tickets"
            icon={Ticket}
            title="All Tickets"
            description="View, filter and manage every support ticket"
            accent="bg-yellow-50"
          />
          <QuickLinkCard
            to="/support/ratings"
            icon={CheckCircle2}
            title="CSAT Report"
            description="Browse customer satisfaction ratings and comments"
            accent="bg-green-50"
          />
        </div>
      </div>
    </div>
  );
}
