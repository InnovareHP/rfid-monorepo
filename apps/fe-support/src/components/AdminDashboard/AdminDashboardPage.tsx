import { getTicketStats } from "@/services/support/support-service";
import { formatHours, type TicketStats } from "@dashboard/shared";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  CircleDot,
  Clock,
  RefreshCw,
  Star,
  Ticket,
  Timer,
  XCircle,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  bg,
  loading,
  suffix,
}: {
  label: string;
  value: number | string | null;
  icon: React.ElementType;
  iconColor: string;
  bg: string;
  loading: boolean;
  suffix?: string;
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
          <p className="text-3xl font-bold text-foreground">
            {value ?? "—"}
            {suffix && value !== null && (
              <span className="ml-1 text-lg font-normal text-muted-foreground">
                {suffix}
              </span>
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function StatsGrid({
  stats,
  loading,
}: {
  stats?: TicketStats;
  loading: boolean;
}) {
  const cards = [
    {
      label: "Open",
      value: stats?.open ?? null,
      icon: CircleDot,
      iconColor: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "In Progress",
      value: stats?.inProgress ?? null,
      icon: RefreshCw,
      iconColor: "text-yellow-600",
      bg: "bg-yellow-50 dark:bg-yellow-950/40",
    },
    {
      label: "Resolved",
      value: stats?.resolved ?? null,
      icon: CheckCircle2,
      iconColor: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950/40",
    },
    {
      label: "Closed",
      value: stats?.closed ?? null,
      icon: XCircle,
      iconColor: "text-gray-500",
      bg: "bg-gray-100 dark:bg-gray-800",
    },
    {
      label: "Unassigned",
      value: stats?.unassigned ?? null,
      icon: AlertCircle,
      iconColor: "text-orange-600",
      bg: "bg-orange-50 dark:bg-orange-950/40",
    },
    {
      label: "Avg CSAT",
      value: stats?.avgCsat ?? null,
      icon: Star,
      iconColor: "text-yellow-500",
      bg: "bg-yellow-50 dark:bg-yellow-950/40",
      suffix: `/ 5 (${stats?.totalRatings ?? 0} ratings)`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => (
        <StatCard key={c.label} {...c} loading={loading} />
      ))}
    </div>
  );
}

function TimeMetricsGrid({
  stats,
  loading,
}: {
  stats?: TicketStats;
  loading: boolean;
}) {
  const cards = [
    {
      label: "Avg First Reply",
      value: formatHours(stats?.avgFirstReplyHours),
      icon: Clock,
      iconColor: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/40",
    },
    {
      label: "Avg Resolution",
      value: formatHours(stats?.avgResolutionHours),
      icon: Timer,
      iconColor: "text-teal-600",
      bg: "bg-teal-50 dark:bg-teal-950/40",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Response times
      </p>
      <div className="grid grid-cols-2 gap-4">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} loading={loading} suffix={undefined} />
        ))}
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery<TicketStats>({
    queryKey: ["support-stats"],
    queryFn: getTicketStats,
    refetchInterval: 60_000,
  });

  return (
    <div className="w-full bg-background">
      <div className="p-6 sm:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Support Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live overview of support activity
          </p>
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <StatsGrid stats={stats} loading={isLoading} />
          <TimeMetricsGrid stats={stats} loading={isLoading} />
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLink
            to="/support/tickets"
            icon={Ticket}
            title="All Tickets"
            description="View, filter and manage every support ticket"
            accent="blue"
          />
          <QuickLink
            to="/support/ratings"
            icon={Star}
            title="CSAT Report"
            description="Browse customer satisfaction ratings and comments"
            accent="yellow"
          />
          <QuickLink
            to="/en"
            icon={CircleDot}
            title="Support Portal"
            description="Open the customer-facing knowledge base and chat"
            accent="green"
            external
          />
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  title,
  description,
  accent,
  external,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: "blue" | "yellow" | "green";
  external?: boolean;
}) {
  const colors = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/40",
      icon: "text-blue-600",
      border: "hover:border-blue-300",
    },
    yellow: {
      bg: "bg-yellow-50 dark:bg-yellow-950/40",
      icon: "text-yellow-600",
      border: "hover:border-yellow-300",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-950/40",
      icon: "text-green-600",
      border: "hover:border-green-300",
    },
  }[accent];

  const inner = (
    <Card
      className={`cursor-pointer border border-border transition-colors ${colors.border} hover:bg-muted/30`}
    >
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}
        >
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
        <div>
          <p className="font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (external) {
    return (
      <Link to={to as any} params={{ lang: "en" } as any}>
        {inner}
      </Link>
    );
  }
  return <Link to={to as any}>{inner}</Link>;
}
