import { HelpCenterPage } from "@/components/help/help-center-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/help/")({
  component: RouteComponent,
  errorComponent: () => (
    <p className="p-6 text-sm text-muted-foreground">
      The help center could not be loaded.
    </p>
  ),
});

function RouteComponent() {
  const { team } = Route.useParams();

  return <HelpCenterPage team={team} />;
}
