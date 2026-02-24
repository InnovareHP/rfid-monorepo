import { ProfilePage } from "@/components/profile-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_team/$team/profile")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    gmail: (search.gmail as string) || undefined,
    message: (search.message as string) || undefined,
  }),
});

function RouteComponent() {
  return <ProfilePage />;
}
