import CustomReportPage from "@/components/custom-report/custom-report-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/report/custom/")({
  component: CustomReportPage,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">Reports could not be loaded.</p>
    </div>
  ),
});
