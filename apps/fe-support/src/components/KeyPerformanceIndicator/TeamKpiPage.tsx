import { KpiCard } from "./KpiCard";
import {
  Activity,
  AlarmClock,
  BarChart3,
  ListChecks,
  Users,
} from "lucide-react";

export function TeamKpiPage() {
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-50 via-indigo-50/30 to-slate-50">
      <div className="border-b bg-white/80 backdrop-blur">
        <div className="px-4 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Team Ticket KPIs
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Monitor ticket volume, workload, and SLA performance across the
                team.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Super admin view — aggregates all admins.
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 pt-4 sm:px-8 sm:pt-6 space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Active tickets"
            value={64}
            subtitle="All tickets across the team that still need action."
            icon={Activity}
            iconBgClassName="bg-blue-50"
            iconColorClassName="text-blue-600"
            trendLabel="+8 vs yesterday"
            trendDirection="up"
          />
          <KpiCard
            title="Tickets today"
            value={27}
            subtitle="New tickets created today for this support channel."
            icon={BarChart3}
            iconBgClassName="bg-indigo-50"
            iconColorClassName="text-indigo-600"
            trendLabel="+5 vs yesterday"
            trendDirection="up"
          />
          <KpiCard
            title="Solved today"
            value={22}
            subtitle="Tickets moved to solved/closed by the team today."
            icon={ListChecks}
            iconBgClassName="bg-emerald-50"
            iconColorClassName="text-emerald-600"
            trendLabel="-3 vs yesterday"
            trendDirection="down"
          />
          <KpiCard
            title="SLA breaches"
            value={4}
            subtitle="Tickets currently outside agreed response/resolution times."
            icon={AlarmClock}
            iconBgClassName="bg-rose-50"
            iconColorClassName="text-rose-600"
            trendLabel="Needs attention"
            trendDirection="down"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Created vs solved (placeholder)
                </h2>
                <p className="text-xs text-slate-500">
                  Trend of tickets created vs solved over the selected period.
                </p>
              </div>
            </div>
            <div className="mt-4 h-44 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 text-xs text-slate-400 flex items-center justify-center text-center px-4">
              Chart placeholder — we&apos;ll render a line or area chart here
              based on API data (e.g. last 7 or 30 days).
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Workload by admin (placeholder)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Rough idea of how active tickets are distributed across the team.
            </p>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Admin A
                </span>
                <span className="font-medium text-slate-800">18</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  Admin B
                </span>
                <span className="font-medium text-slate-800">15</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Admin C
                </span>
                <span className="font-medium text-slate-800">13</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Team tickets (table placeholder)
              </h2>
              <p className="text-xs text-slate-500">
                This will become a filterable table of active tickets with
                status, priority, and assignee.
              </p>
            </div>
          </div>
          <div className="mt-3 h-44 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 text-xs text-slate-400 flex items-center justify-center text-center px-4">
            Table placeholder — later we&apos;ll plug in the reusable table
            component to list tickets across all admins.
          </div>
        </section>
      </div>
    </div>
  );
}

