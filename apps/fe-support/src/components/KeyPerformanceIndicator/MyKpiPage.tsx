import { KpiCard } from "./KpiCard";
import {
  Activity,
  Clock,
  MessageCircle,
  TicketCheck,
} from "lucide-react";

export function MyKpiPage() {
  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <div className="border-b bg-white/80 backdrop-blur">
        <div className="px-4 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                My Ticket KPIs
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                See your ticket load and how you&apos;re performing today.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              Placeholder data — we&apos;ll wire this to real metrics later.
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-8 pt-4 sm:px-8 sm:pt-6 space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="My active tickets"
            value={18}
            subtitle="Tickets currently assigned to you that still need action."
            icon={TicketCheck}
            iconBgClassName="bg-blue-50"
            iconColorClassName="text-blue-600"
            trendLabel="Stable vs yesterday"
            trendDirection="neutral"
          />
          <KpiCard
            title="Tickets created today"
            value={9}
            subtitle="New tickets assigned to you since midnight."
            icon={Activity}
            iconBgClassName="bg-amber-50"
            iconColorClassName="text-amber-600"
            trendLabel="+2 vs yesterday"
            trendDirection="up"
          />
          <KpiCard
            title="Tickets solved today"
            value={7}
            subtitle="Tickets you moved to solved/closed today."
            icon={MessageCircle}
            iconBgClassName="bg-emerald-50"
            iconColorClassName="text-emerald-600"
            trendLabel="-1 vs yesterday"
            trendDirection="down"
          />
          <KpiCard
            title="Overdue / at risk"
            value={3}
            subtitle="Tickets breaching or close to breaching SLAs."
            icon={Clock}
            iconBgClassName="bg-rose-50"
            iconColorClassName="text-rose-600"
            trendLabel="Review these first"
            trendDirection="down"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Today&apos;s flow (placeholder)
                </h2>
                <p className="text-xs text-slate-500">
                  Created vs solved per hour for your tickets.
                </p>
              </div>
            </div>
            <div className="mt-4 h-40 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 text-xs text-slate-400 flex items-center justify-center text-center px-4">
              Chart placeholder — we&apos;ll plug in a line or area chart here
              once the API is ready.
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-1.5">
              Status breakdown (placeholder)
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              Quick snapshot of how your current tickets are distributed.
            </p>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Open
                </span>
                <span className="font-medium text-slate-800">10</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Pending / waiting
                </span>
                <span className="font-medium text-slate-800">5</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Solved today
                </span>
                <span className="font-medium text-slate-800">7</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                My tickets (table placeholder)
              </h2>
              <p className="text-xs text-slate-500">
                We&apos;ll hook this into the real ticket table once the API is
                ready.
              </p>
            </div>
          </div>
          <div className="mt-3 h-40 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 text-xs text-slate-400 flex items-center justify-center text-center px-4">
            Table placeholder — this will show your active tickets with filters
            for status, priority, and SLA.
          </div>
        </section>
      </div>
    </div>
  );
}

