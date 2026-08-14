import { getTicketStats } from "@/services/support/support-service";
import { formatHours, type TicketStats } from "@dashboard/shared";
import { useQuery } from "@tanstack/react-query";
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
import { QuickLinkCard, StatCard } from "./StatsPage/StatsCards";

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery<TicketStats>({
    queryKey: ["support-stats"],
    queryFn: getTicketStats,
    refetchInterval: 60_000,
  });

  return (
    <div className="bg-background w-full">
      <div className="space-y-8 p-6 sm:p-8">
        <div>
          <h1 className="page-title text-2xl font-bold tracking-tight sm:text-3xl">
            Support Dashboard
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Live overview of support activity
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Open"
              value={stats?.open ?? null}
              icon={CircleDot}
              tone="info"
              loading={isLoading}
            />
            <StatCard
              label="In Progress"
              value={stats?.inProgress ?? null}
              icon={RefreshCw}
              tone="warning"
              loading={isLoading}
            />
            <StatCard
              label="Resolved"
              value={stats?.resolved ?? null}
              icon={CheckCircle2}
              tone="success"
              loading={isLoading}
            />
            <StatCard
              label="Closed"
              value={stats?.closed ?? null}
              icon={XCircle}
              loading={isLoading}
            />
            <StatCard
              label="Overdue"
              value={stats?.overdue ?? null}
              icon={AlertCircle}
              tone="destructive"
              loading={isLoading}
            />
            <StatCard
              label="Avg CSAT"
              value={stats?.avgCsat ?? null}
              icon={Star}
              tone="warning"
              loading={isLoading}
              suffix={`/ 5 (${stats?.totalRatings ?? 0} ratings)`}
            />
          </div>

          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Response times
            </p>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Avg First Reply"
                value={formatHours(stats?.avgFirstReplyHours)}
                icon={Clock}
                loading={isLoading}
              />
              <StatCard
                label="Avg Resolution"
                value={formatHours(stats?.avgResolutionHours)}
                icon={Timer}
                loading={isLoading}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLinkCard
            to="/support/tickets"
            icon={Ticket}
            title="All Tickets"
            description="View, filter and manage every support ticket"
          />
          <QuickLinkCard
            to="/support/ratings"
            icon={Star}
            title="CSAT Report"
            description="Browse customer satisfaction ratings and comments"
          />
          <QuickLinkCard
            to="/$lang"
            params={{ lang: "en" }}
            icon={CircleDot}
            title="Support Portal"
            description="Open the customer-facing knowledge base and chat"
          />
        </div>
      </div>
    </div>
  );
}
