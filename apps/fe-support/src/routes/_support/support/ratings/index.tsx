import { CsatReportPage } from "@/components/AdminDashboard/StatsPage/CsatReportPage";
import { IsSupportOrAdmin } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_support/support/ratings/")({
  component: CsatReportPage,
  beforeLoad: IsSupportOrAdmin,
});
