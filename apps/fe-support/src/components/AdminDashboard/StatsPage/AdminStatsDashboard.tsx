import { getMetrics } from "@/services/admin/admin-service";
import { getTicketStats } from "@/services/support/support-service";
import type { TicketStats } from "@dashboard/shared";
import { Badge } from "@dashboard/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@dashboard/ui/components/card";
import { Skeleton } from "@dashboard/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  FileSignature,
  Hourglass,
  ListChecks,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { QuickLinkCard, StatCard } from "./StatsCards";

const QUEUE_BOARD_URL = "/api/queues";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  active: "success",
  trialing: "info",
  past_due: "warning",
  canceled: "destructive",
  incomplete: "secondary",
  unknown: "outline",
};

export function AdminStatsDashboard() {
  const { data: ticketStats, isLoading: ticketsLoading } =
    useQuery<TicketStats>({
      queryKey: ["support-stats"],
      queryFn: getTicketStats,
      refetchInterval: 60_000,
    });

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: getMetrics,
    refetchInterval: 60_000,
  });

  const users = metrics?.users;
  const orgs = metrics?.organizations;
  const subs = metrics?.subscriptions;

  const ticketTotal = ticketStats
    ? ticketStats.open +
      ticketStats.inProgress +
      ticketStats.resolved +
      ticketStats.closed
    : null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-xl">
            <Shield className="text-muted-foreground h-6 w-6" />
          </div>
          <div>
            <h1 className="page-title text-2xl font-bold tracking-tight sm:text-3xl">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Platform overview — accounts, organizations, billing, and tickets
            </p>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-foreground text-sm font-semibold uppercase tracking-wide">
            Accounts
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Users"
              value={users?.total ?? null}
              icon={Users}
              loading={metricsLoading}
            />
            <StatCard
              label="Onboarded"
              value={users?.onboarded ?? null}
              icon={UserCheck}
              tone="success"
              loading={metricsLoading}
            />
            <StatCard
              label="Banned"
              value={users?.banned ?? null}
              icon={ShieldAlert}
              tone="destructive"
              loading={metricsLoading}
            />
            <StatCard
              label="Super admins"
              value={users?.superAdmins ?? null}
              icon={Shield}
              tone="warning"
              loading={metricsLoading}
            />
            <StatCard
              label="New in 30 days"
              value={users?.newLast30Days ?? null}
              icon={UserPlus}
              tone="info"
              loading={metricsLoading}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-foreground text-sm font-semibold uppercase tracking-wide">
            Organizations
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Organizations"
              value={orgs?.total ?? null}
              icon={Building2}
              loading={metricsLoading}
            />
            <StatCard
              label="New in 30 days"
              value={orgs?.newLast30Days ?? null}
              icon={UserPlus}
              tone="info"
              loading={metricsLoading}
            />
            <StatCard
              label="HIPAA mode"
              value={orgs?.hipaaEnabled ?? null}
              icon={ShieldCheck}
              tone="success"
              loading={metricsLoading}
            />
            <StatCard
              label="BAA signed"
              value={orgs?.baaSigned ?? null}
              icon={FileSignature}
              tone="success"
              loading={metricsLoading}
            />
          </div>
          {/* HIPAA mode without a signed BAA is a compliance gap, not a stat. */}
          {orgs && orgs.hipaaEnabled > orgs.baaSigned && (
            <p className="text-destructive text-sm font-medium">
              {orgs.hipaaEnabled - orgs.baaSigned} organization(s) run HIPAA mode
              with no executed BAA.
            </p>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ListChecks className="text-muted-foreground h-5 w-5" />
              Subscriptions
            </CardTitle>
            <CardDescription>
              Counted from subscription rows, not from Stripe. Revenue is not
              shown because prices live in Stripe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {metricsLoading ? (
              <Skeleton className="h-8 w-64" />
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {subs?.byStatus.length ? (
                  subs.byStatus.map((row) => (
                    <Badge
                      key={row.status}
                      variant={STATUS_VARIANTS[row.status] ?? "outline"}
                    >
                      {row.status}: {row.count}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground text-sm">
                    No subscriptions
                  </span>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Trials ending in 7 days"
                value={subs?.trialsExpiringIn7Days ?? null}
                icon={Hourglass}
                tone="warning"
                loading={metricsLoading}
              />
              <StatCard
                label="Custom contracts"
                value={subs?.customContracts ?? null}
                icon={FileSignature}
                tone="info"
                loading={metricsLoading}
              />
            </div>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-foreground text-sm font-semibold uppercase tracking-wide">
            Tickets
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              label="Total"
              value={ticketTotal}
              icon={Ticket}
              loading={ticketsLoading}
            />
            <StatCard
              label="Open"
              value={ticketStats?.open ?? null}
              icon={CircleDot}
              tone="info"
              loading={ticketsLoading}
            />
            <StatCard
              label="In progress"
              value={ticketStats?.inProgress ?? null}
              icon={RefreshCw}
              tone="warning"
              loading={ticketsLoading}
            />
            <StatCard
              label="Resolved"
              value={ticketStats?.resolved ?? null}
              icon={CheckCircle2}
              tone="success"
              loading={ticketsLoading}
            />
            <StatCard
              label="Closed"
              value={ticketStats?.closed ?? null}
              icon={XCircle}
              loading={ticketsLoading}
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLinkCard
            to="/admin/users"
            icon={Users}
            title="User Management"
            description="View, search, and manage platform users"
          />
          <QuickLinkCard
            to="/admin/organizations"
            icon={Building2}
            title="Organizations"
            description="Entitlements, HIPAA state, members, and subscriptions"
          />
          <QuickLinkCard
            to="/admin/activity-log"
            icon={ClipboardList}
            title="Activity Log"
            description="Every admin action, with the reason for impersonations"
          />
          <QuickLinkCard
            to="/support/tickets"
            icon={Ticket}
            title="All Tickets"
            description="View, filter and manage every support ticket"
          />
          <QuickLinkCard
            to="/support/ratings"
            icon={CheckCircle2}
            title="CSAT Report"
            description="Browse customer satisfaction ratings and comments"
          />
          <QuickLinkCard
            href={QUEUE_BOARD_URL}
            icon={ListChecks}
            title="Job Queues"
            description="Bull Board — email, bulk email, CSV import, and AI jobs"
          />
        </div>
      </div>
    </div>
  );
}
