import { SupportLayout } from "@/components/SupportLayout/SupportLayout";
import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang")({
  component: LangLayoutComponent,
});

function LangLayoutComponent() {
  const { pathname } = useLocation();
  const isDashboard = pathname.endsWith("/dashboard");

  if (isDashboard) {
    return <Outlet />;
  }

  return (
    <SupportLayout>
      <Outlet />
    </SupportLayout>
  );
}
