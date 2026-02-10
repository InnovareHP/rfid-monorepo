import ImportPage from "@/components/import/import-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/import/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ImportPage />;
}
