import ModuleSetupPage from "@/components/module-setup/module-setup-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/records/new")({
  component: ModuleSetupPage,
  errorComponent: () => (
    <div className="page-style">
      <p className="text-destructive">The module setup could not be loaded.</p>
    </div>
  ),
});
