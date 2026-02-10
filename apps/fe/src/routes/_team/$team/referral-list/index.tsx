import ReferralListPage from "@/components/referral-list/referral-list-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/referral-list/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ReferralListPage />;
}
