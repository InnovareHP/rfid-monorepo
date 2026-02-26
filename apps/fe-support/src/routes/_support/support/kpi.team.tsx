import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

const TeamKpiPage = React.lazy(() =>
  import("@/components/KeyPerformanceIndicator/TeamKpiPage").then((m) => ({
    default: m.TeamKpiPage,
  }))
);

export const Route = createFileRoute("/_support/support/kpi/team")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-slate-500" />}>
      <TeamKpiPage />
    </React.Suspense>
  );
}

