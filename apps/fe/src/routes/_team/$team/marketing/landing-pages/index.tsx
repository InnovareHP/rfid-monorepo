import { MarketingLandingPagesListPage } from "@/components/marketing/landing-page/marketing-landing-pages-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_team/$team/marketing/landing-pages/"
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <MarketingLandingPagesListPage />;
}
