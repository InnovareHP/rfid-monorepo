import { ModuleListRoute } from "@/components/crm-list/module-list-route";
import { validateRecordSearch } from "@/lib/helper/record-search";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/records/$moduleKey/")({
  validateSearch: validateRecordSearch,
  component: ModuleListRoute,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">This module could not be loaded.</p>
    </div>
  ),
});
