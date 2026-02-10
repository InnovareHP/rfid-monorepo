import { SupportPortalPage } from "@/components/support-portal-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return <SupportPortalPage />;
}
