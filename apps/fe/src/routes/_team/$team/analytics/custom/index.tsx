import CustomAnalyticsPage from "@/components/custom-analytics/custom-analytics-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/analytics/custom/")({
  component: CustomAnalyticsPage,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">Custom analytics could not be loaded.</p>
    </div>
  ),
});
