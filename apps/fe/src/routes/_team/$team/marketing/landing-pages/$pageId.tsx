import { LandingPageBuilderPage } from "@/components/marketing/landing-page/landing-page-builder-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_team/$team/marketing/landing-pages/$pageId"
)({
  component: RouteComponent,
});

function RouteComponent() {
  return <LandingPageBuilderPage />;
}
