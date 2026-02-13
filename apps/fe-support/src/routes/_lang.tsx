import { SupportLayout } from "@/components/SupportLayout/SupportLayout";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang")({
  component: LangLayoutComponent,
});

function LangLayoutComponent() {
  return (
    <SupportLayout>
      <Outlet />
    </SupportLayout>
  );
}
