import LiaisonPerformancePage from "@/components/analytics/liaison-performance-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/liaison-performance")({
  component: RouteComponent,
});

function RouteComponent() {
  return <LiaisonPerformancePage />;
}
