import { ModuleCreateRoute } from "@/components/crm-list/module-list-route";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/records/$moduleKey/create")({
  component: ModuleCreateRoute,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">This module could not be loaded.</p>
    </div>
  ),
});
