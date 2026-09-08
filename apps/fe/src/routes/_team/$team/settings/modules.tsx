import { ModuleManagePage } from "@/components/module-manage/module-manage-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/settings/modules")({
  component: ModuleManagePage,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">Modules could not be loaded.</p>
    </div>
  ),
});
