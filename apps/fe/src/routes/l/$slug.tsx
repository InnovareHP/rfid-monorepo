import { PublicLandingPage } from "@/components/marketing/landing-page/public-landing-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/l/$slug")({
  component: RouteComponent,
});

function RouteComponent() {
  return <PublicLandingPage />;
}
