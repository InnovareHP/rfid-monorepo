import { ProfilePage } from "@/components/profile-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/profile")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProfilePage />;
}
