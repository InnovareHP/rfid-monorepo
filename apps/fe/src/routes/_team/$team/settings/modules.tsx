import { ModuleManagePage } from "@/components/module-manage/module-manage-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/settings/modules")({
  // The sidebar's New Group entry lands here with the name field already open.
  validateSearch: (search: Record<string, unknown>) => ({
    newGroup: search.newGroup === true || search.newGroup === "true",
  }),
  component: ModuleManagePage,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">Modules could not be loaded.</p>
    </div>
  ),
});
