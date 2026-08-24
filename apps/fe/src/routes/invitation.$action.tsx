import AcceptInvitation from "@/components/invitation/invitation";
import { createFileRoute, notFound, useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/invitation/$action")({
  component: RouteComponent,
  // The invite email carries the invitee's context in the link, so all four
  // are declared here rather than read off an untyped search object.
  validateSearch: (search: Record<string, unknown>) => ({
    token: (search.token as string) || undefined,
    email: (search.email as string) || undefined,
    orgName: (search.orgName as string) || undefined,
    inviter: (search.inviter as string) || undefined,
  }),
  beforeLoad: async ({ params }) => {
    const { action } = params;
    if (!["accept", "reject"].includes(action)) {
      throw notFound();
    }
  },
});

function RouteComponent() {
  const { action } = useParams({ from: "/invitation/$action" }) as {
    action: "accept" | "reject";
  };
  return <AcceptInvitation action={action} />;
}
