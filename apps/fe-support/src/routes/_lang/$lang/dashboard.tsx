import { DashboardLayout, DashboardPage } from "@/components/Dashboard";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang/$lang/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DashboardLayout>
      <DashboardPage />
    </DashboardLayout>
  );
}
