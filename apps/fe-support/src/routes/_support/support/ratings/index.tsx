import { CsatReportPage } from "@/components/AdminDashboard/CsatReportPage";
import { IsSupport } from "@/lib/authorization";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_support/support/ratings/")({
  component: CsatReportPage,
  beforeLoad: IsSupport,
});
