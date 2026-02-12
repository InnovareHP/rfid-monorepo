import { SupportPortalPage } from "@/components/SupportPortalPage/SupportPortalPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang/$lang/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <SupportPortalPage />;
}
