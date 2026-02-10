import { SupportPortalPage } from "@/components/support-portal-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SupportPortalPage />;
}
