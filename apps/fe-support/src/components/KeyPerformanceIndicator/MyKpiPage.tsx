import { getTicketStats } from "@/services/support/support-service";
import {
  SLA_FIRST_REPLY_HOURS,
  SLA_RESOLUTION_HOURS,
  type TicketStats,
} from "@dashboard/shared";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, MessageCircle, TicketCheck } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { KpiPanel } from "./KpiPanel";
import { StatusBreakdown } from "./StatusBreakdown";

export function MyKpiPage() {
  const { data: stats, isLoading } = useQuery<TicketStats>({
    queryKey: ["support-stats"],
    queryFn: getTicketStats,
    refetchInterval: 60_000,
  });

  const active = stats ? stats.open + stats.inProgress : null;

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-muted via-primary/5 to-muted">
      <div className="border-b bg-card/80 backdrop-blur">
        <div className="px-4 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="page-title text-2xl font-semibold tracking-tight">
                My Ticket KPIs
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                See your ticket load and how you&apos;re performing today.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
              <span className="inline-flex h-2 w-2 rounded-full bg-success" />
              Scoped to tickets assigned to you.
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 pt-4 sm:px-8 sm:pt-6 space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="My active tickets"
            value={active}
            loading={isLoading}
            subtitle="Assigned to you and still needing action."
            icon={TicketCheck}
          />
          <KpiCard
            title="Tickets today"
            value={stats?.createdToday ?? null}
            loading={isLoading}
            subtitle="New tickets assigned to you since midnight."
            icon={Activity}
            iconBgClassName="bg-warning/10"
            iconColorClassName="text-warning"
          />
          <KpiCard
            title="Solved today"
            value={stats?.solvedToday ?? null}
            loading={isLoading}
            subtitle="Tickets you resolved or closed today."
            icon={MessageCircle}
            iconBgClassName="bg-success/10"
            iconColorClassName="text-success"
          />
          <KpiCard
            title="Overdue / at risk"
            value={stats ? stats.overdue + stats.atRisk : null}
            loading={isLoading}
            subtitle={`${stats?.overdue ?? 0} past ${SLA_FIRST_REPLY_HOURS}h with no reply, ${stats?.atRisk ?? 0} unresolved past ${SLA_RESOLUTION_HOURS}h.`}
            icon={Clock}
            iconBgClassName="bg-destructive/10"
            iconColorClassName="text-destructive"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <KpiPanel
            className="lg:col-span-2"
            title="Response times"
            description="Averages across every ticket assigned to you."
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard
                title="Avg first reply"
                value={stats?.avgFirstReplyHours ?? null}
                loading={isLoading}
                suffix="h"
              />
              <KpiCard
                title="Avg resolution"
                value={stats?.avgResolutionHours ?? null}
                loading={isLoading}
                suffix="h"
              />
              <KpiCard
                title="Avg CSAT"
                value={stats?.avgCsat ?? null}
                loading={isLoading}
                suffix={`/ 5 (${stats?.totalRatings ?? 0})`}
              />
            </div>
          </KpiPanel>

          <KpiPanel
            title="Status breakdown"
            description="Every ticket you have handled."
          >
            <StatusBreakdown stats={stats} loading={isLoading} />
          </KpiPanel>
        </section>
      </div>
    </div>
  );
}
