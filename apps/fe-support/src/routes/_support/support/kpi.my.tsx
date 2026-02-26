import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

const MyKpiPage = React.lazy(() =>
  import("@/components/KeyPerformanceIndicator/MyKpiPage").then((m) => ({
    default: m.MyKpiPage,
  }))
);

export const Route = createFileRoute("/_support/support/kpi/my")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-slate-500" />}>
      <MyKpiPage />
    </React.Suspense>
  );
}

