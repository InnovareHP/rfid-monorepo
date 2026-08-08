import { HelpCategoryPage } from "@/components/help/help-category-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/help/$categorySlug/")({
  component: RouteComponent,
  errorComponent: () => (
    <p className="p-6 text-sm text-muted-foreground">
      This help category could not be loaded.
    </p>
  ),
});

function RouteComponent() {
  const { team, categorySlug } = Route.useParams();

  return <HelpCategoryPage team={team} categorySlug={categorySlug} />;
}
