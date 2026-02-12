import { AccountPage } from "@/components/AccountPage/AccountPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_lang/$lang/account")({
  component: RouteComponent,
});

function RouteComponent() {
  return <AccountPage />;
}
