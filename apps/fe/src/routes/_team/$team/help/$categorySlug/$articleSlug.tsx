import { HelpArticlePage } from "@/components/help/help-article-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_team/$team/help/$categorySlug/$articleSlug"
)({
  component: RouteComponent,
  errorComponent: () => (
    <p className="p-6 text-sm text-muted-foreground">
      This article could not be loaded.
    </p>
  ),
});

function RouteComponent() {
  const { team, categorySlug, articleSlug } = Route.useParams();

  return (
    <HelpArticlePage
      team={team}
      categorySlug={categorySlug}
      articleSlug={articleSlug}
    />
  );
}
