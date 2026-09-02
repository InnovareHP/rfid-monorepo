import ModuleAnalyticsPage from "@/components/custom-analytics/module/module-analytics-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_team/$team/records/$moduleKey/analytics/"
)({
  component: ModuleAnalyticsPage,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">Analytics could not be loaded.</p>
    </div>
  ),
});
