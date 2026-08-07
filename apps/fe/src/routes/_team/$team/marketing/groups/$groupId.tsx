import { GroupDetailPage } from "@/components/marketing/groups/group-detail-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/marketing/groups/$groupId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <GroupDetailPage />;
}
